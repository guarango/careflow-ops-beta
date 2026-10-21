import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Called by the SignDocument page when an employee submits their signature.
// Captures IP/device, computes a document fingerprint, updates the request,
// marks any linked OnboardingDocument as Signed, and notifies HR/manager.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { request_id, field_data, signature_data, signed_pdf_uri } = body;

    if (!request_id) return Response.json({ error: 'request_id is required' }, { status: 400 });

    // Fetch the request (service role to bypass RLS for admin operations)
    const request = await base44.asServiceRole.entities.SignatureRequest.get(request_id);
    if (!request) return Response.json({ error: 'Signature request not found' }, { status: 404 });

    // Verify the caller owns this request (or is admin)
    if (request.staff_id !== user.data?.staff_member_id && user.role !== 'admin' && user.role !== 'super_admin') {
      // Still allow if the email matches
      const userEmail = user.email;
      const staff = await base44.asServiceRole.entities.StaffMember.get(request.staff_id).catch(() => null);
      if (!staff || staff.email !== userEmail) {
        return Response.json({ error: 'Not authorized to sign this document' }, { status: 403 });
      }
    }

    // Capture IP and device info from request headers
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ip_address = forwarded.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';
    const device_type = /Mobile|Android|iPhone|iPad/i.test(user_agent) ? 'Mobile' : 'Desktop';

    const now = new Date();
    const signedAt = now.toISOString();

    // Compute document fingerprint
    const fingerprintInput = `${request.template_id}|${request.staff_id}|${signedAt}|${JSON.stringify(field_data)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const document_fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const certificate_data = {
      signer_name: request.staff_name,
      signer_email: request.staff_email || user.email,
      signed_at: signedAt,
      ip_address,
      device_type,
      user_agent,
      document_fingerprint,
    };

    // Update the signature request
    await base44.asServiceRole.entities.SignatureRequest.update(request_id, {
      status: 'Signed',
      signed_at: signedAt,
      field_data: field_data || [],
      signature_data: signature_data || null,
      signed_pdf_uri,
      certificate_data,
    });

    // Mark linked OnboardingDocument as Signed
    if (request.onboarding_doc_id) {
      await base44.asServiceRole.entities.OnboardingDocument.update(request.onboarding_doc_id, {
        status: 'Signed',
        signed_date: now.toISOString().split('T')[0],
      }).catch(() => {});
    }

    // Notify HR/admin that a document was signed
    const admins = await base44.asServiceRole.entities.StaffMember.filter({
      role: { $in: ['Admin', 'Supervisor'] },
    }, { limit: 50 }).catch(() => ({ items: [] }));

    const adminList = admins?.items || admins || [];
    const notifPromises = [];
    for (const admin of adminList) {
      if (!admin.user_id) continue;
      notifPromises.push(
        base44.asServiceRole.entities.AppNotification.create({
          type: 'timecard_reminder',
          recipient_user_id: admin.user_id,
          recipient_email: admin.email || '',
          recipient_role: 'admin',
          staff_id: request.staff_id,
          staff_name: request.staff_name,
          related_record_id: request_id,
          related_record_type: 'timecard',
          message: `${request.staff_name} has signed "${request.template_name}".`,
          trigger_stage: 'forgot_clockout_15min',
          status: 'unread',
          email_sent: false,
        }).catch(() => {})
      );
    }
    await Promise.allSettled(notifPromises);

    return Response.json({
      success: true,
      signed_at: signedAt,
      document_fingerprint,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}