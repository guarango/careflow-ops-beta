import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — Admin only' }, { status: 403 });

    const users = await base44.asServiceRole.entities.User.list();

    // Legacy role → new role + bundles mapping
    const LEGACY_MAP = {
      admin:            { role: 'admin',  hr_bundle: true,  billing_bundle: true  },
      hr:               { role: 'admin',  hr_bundle: true,  billing_bundle: false },
      billing:          { role: 'admin',  hr_bundle: false, billing_bundle: true  },
      program_director: { role: 'admin',  hr_bundle: true,  billing_bundle: true  },
      supervisor:       { role: 'manager', hr_bundle: false, billing_bundle: false },
      lead_dsp:         { role: 'manager', hr_bundle: false, billing_bundle: false },
      case_manager:     { role: 'dsp',    hr_bundle: false, billing_bundle: false },
      bcba:             { role: 'dsp',    hr_bundle: false, billing_bundle: false },
      nurse:            { role: 'dsp',    hr_bundle: false, billing_bundle: false },
      dsp:              { role: 'dsp',    hr_bundle: false, billing_bundle: false },
    };

    const results = [];
    for (const u of users) {
      // Special case: cole.morley@gmail.com → Super Admin
      if (u.email === 'cole.morley@gmail.com') {
        await base44.asServiceRole.entities.User.update(u.id, {
          role: 'admin',
          is_super_admin: true,
          hr_bundle: false,
          billing_bundle: false,
        });
        results.push({ email: u.email, oldRole: u.role, newRole: 'super_admin', bundles: 'n/a' });
        continue;
      }

      // Special case: cole@highcountrymetalworks.com → Admin (no bundles, for testing)
      if (u.email === 'cole@highcountrymetalworks.com') {
        await base44.asServiceRole.entities.User.update(u.id, {
          role: 'admin',
          is_super_admin: false,
          hr_bundle: false,
          billing_bundle: false,
        });
        results.push({ email: u.email, oldRole: u.role, newRole: 'admin', bundles: 'none' });
        continue;
      }

      // Map legacy role
      const mapping = LEGACY_MAP[u.role] || LEGACY_MAP.dsp;
      await base44.asServiceRole.entities.User.update(u.id, {
        role: mapping.role,
        is_super_admin: false,
        hr_bundle: mapping.hr_bundle,
        billing_bundle: mapping.billing_bundle,
      });
      const bundleList = [
        mapping.hr_bundle && 'hr',
        mapping.billing_bundle && 'billing',
      ].filter(Boolean).join('+') || 'none';
      results.push({ email: u.email, oldRole: u.role, newRole: mapping.role, bundles: bundleList });
    }

    return Response.json({ success: true, migrated: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}