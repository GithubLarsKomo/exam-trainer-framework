# Fügetechnik open source and asset gaps

Date: 2026-08-07

This file is the explicit residual-debt inventory after runtime catalog 0.5.10. It complements `docs/fuegetechnik-source-audit.md`: the audit explains the evidence decisions, while this file defines the currently expected unresolved set so that new or disappearing warnings cannot pass unnoticed.

## Runtime cards still missing `sourcePage`

| Card(s) | Exam question | Reason still open |
| --- | --- | --- |
| `ft01d1` | Q1d | The script explains screw loading and thread behavior, but the remembered axial-direction answer `Formschluss des Gewindes` has not been directly established strongly enough. |
| `ft0901`–`ft0903` | Q9 | The script mentions semi-tubular self-piercing riveting with composite components, but does not directly support the current CFK-specific brittleness/delamination/fibre-damage answer or the proposed adhesive alternative. |
| `ft1001`–`ft1002` | Q10 | No directly matching clinch force-displacement curve with tolerance band and poor-process curve has been found in the approved source. |
| `ft2401` | Q24 | The approved script does not yet establish the complete three-part relationship `strength ↑`, `hardness ↑`, `elongation ↓` in one sufficiently direct evidence chain. |
| `ft3001` | Q30 | General aluminium and resistance-welding evidence exists, but the current two aluminium-specific resistance-spot-welding difficulties have not been directly grounded as written. |
| `ft3401` | Q34 | Generic low CO₂-laser absorption in metals is documented, but the current copper-specific absorption/reflection claim needs direct approved evidence. |
| `ft3502` | Q35 | `Klebstoff` is defined in the script; the separate runtime definition of `Kleber` as the cured adhesive has not been found. |
| `ft4101` | Q41 | Shear-vs-peel loading is supported, but the complete overlap-end shear plus normal/peel stress-distribution statement is not directly established. |
| `ft4301`–`ft4302` | Q43 | Aluminium oxide and solder wetting are supported in separate contexts, but the current combined aluminium-soldering claims are stronger than the audited direct evidence. |
| `ft4501` | Q45 | The remembered task is diagram-dependent; an approved exam asset or source-safe reconstruction is still required before treating the current placement answer as complete exam evidence. |

Total expected runtime `MISSING_SOURCE_PAGE` warnings: **14 cards**.

## Remembered exam tasks intentionally absent from the runtime catalog

The memory protocol also relies on supplied images/diagrams for Q6, Q8, Q17, Q20, Q29, Q36 and Q40. These tasks are intentionally not represented by guessed substitute content. They remain blocked on approved local assets or an explicitly approved source-safe reconstruction.

Q45 is different: a text card exists in the runtime catalog, but the remembered examination task itself is diagram-dependent, so it remains in the unresolved runtime set above.

## Guardrail

The regression test `tests/fuegetechnik-source-gap-inventory.test.ts` pins the exact 14-card warning set. A source-audit change must deliberately update both the evidence and this expected set. An unrelated code change must not silently add a new `MISSING_SOURCE_PAGE` warning or remove one without evidence.

This inventory does **not** waive any warning. It turns the residual source debt into an explicit review gate and preserves the rule that missing evidence is not replaced by generic domain knowledge.
