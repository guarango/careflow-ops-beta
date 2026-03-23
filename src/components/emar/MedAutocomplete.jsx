import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

const MED_LIST = [
  // Psychiatric / Behavioral
  { name: "Risperidone", category: "Antipsychotic" },
  { name: "Aripiprazole", category: "Antipsychotic" },
  { name: "Quetiapine", category: "Antipsychotic" },
  { name: "Olanzapine", category: "Antipsychotic" },
  { name: "Haloperidol", category: "Antipsychotic" },
  { name: "Clonazepam", category: "Benzodiazepine" },
  { name: "Lorazepam", category: "Benzodiazepine" },
  { name: "Diazepam", category: "Benzodiazepine" },
  { name: "Buspirone", category: "Anxiolytic" },
  { name: "Sertraline", category: "Antidepressant" },
  { name: "Fluoxetine", category: "Antidepressant" },
  { name: "Escitalopram", category: "Antidepressant" },
  { name: "Lithium", category: "Mood Stabilizer" },
  { name: "Valproic acid", category: "Mood Stabilizer" },
  { name: "Clozapine", category: "Antipsychotic" },
  // Seizure / Neurological
  { name: "Levetiracetam", category: "Seizure" },
  { name: "Lamotrigine", category: "Seizure" },
  { name: "Oxcarbazepine", category: "Seizure" },
  { name: "Carbamazepine", category: "Seizure" },
  { name: "Phenobarbital", category: "Seizure" },
  { name: "Topiramate", category: "Seizure" },
  { name: "Zonisamide", category: "Seizure" },
  { name: "Gabapentin", category: "Seizure / Nerve" },
  { name: "Phenytoin", category: "Seizure" },
  // ADHD / Attention
  { name: "Methylphenidate", category: "ADHD" },
  { name: "Amphetamine salts", category: "ADHD" },
  { name: "Atomoxetine", category: "ADHD" },
  { name: "Guanfacine", category: "ADHD" },
  { name: "Clonidine", category: "ADHD" },
  // GI / Physical
  { name: "Melatonin", category: "Sleep" },
  { name: "Docusate", category: "GI" },
  { name: "Polyethylene glycol (MiraLax)", category: "GI" },
  { name: "Omeprazole", category: "GI" },
  { name: "Ranitidine", category: "GI" },
  { name: "Baclofen", category: "Muscle Relaxant" },
  { name: "Tizanidine", category: "Muscle Relaxant" },
  { name: "Glycopyrrolate", category: "Anticholinergic" },
  { name: "Hyoscine", category: "Anticholinergic" },
  { name: "Metformin", category: "Diabetes" },
  { name: "Levothyroxine", category: "Thyroid" },
  // Pain / Other
  { name: "Acetaminophen", category: "Pain" },
  { name: "Ibuprofen", category: "Pain / Anti-inflammatory" },
  { name: "Naproxen", category: "Pain / Anti-inflammatory" },
  { name: "Hydroxyzine", category: "Antihistamine / Anxiolytic" },
  { name: "Diphenhydramine", category: "Antihistamine" },
  { name: "Cetirizine", category: "Antihistamine" },
  { name: "Loratadine", category: "Antihistamine" },
];

export default function MedAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.length < 1
    ? []
    : MED_LIST.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10);

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const select = (med) => {
    setQuery(med.name);
    onChange(med.name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Input
        value={query}
        onChange={handleInput}
        onFocus={() => query.length >= 1 && setOpen(true)}
        placeholder="Type to search medications..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((med) => (
            <button
              key={med.name}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted text-left text-sm"
              onMouseDown={() => select(med)}
            >
              <span className="font-medium">{med.name}</span>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{med.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}