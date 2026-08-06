# Fügetechnik source audit

Date: 2026-08-06

This audit compares the built-in runtime catalog with the two project sources:

- `Fuegetechnikskript_SoSe2026.pdf`
- `Gedächtnisprotokoll Fügetechnik SS24`

The memory protocol states that the remembered exam contained 57 subtasks and 202 points and explicitly warns that the wording is reconstructed rather than verbatim. The aggregate is useful release evidence, but it does **not** establish the point value of each individual remembered task.

## Rules

1. A remembered exam question establishes exam relevance, not the technical answer by itself.
2. Technical answers and `sourcePage` metadata require support in the script or another approved source.
3. Image-dependent tasks stay open until the actual approved image/diagram is available; a guessed replacement is not acceptable.
4. A runtime card may be useful supplemental learning content while still failing to answer the remembered exam question assigned to the same number. That mismatch must remain visible.

## Verified runtime evidence

| Runtime card(s) | Exam question | Script evidence | Audit result |
| --- | --- | --- | --- |
| `ft0201`–`ft0203` | 2 | S. 17, 3.3.1 Festigkeitsklassen | Source page assigned |
| `ft0401` | 4 | S. 19–20, 3.4.1 Vorspannkraft | Source page assigned |
| `ft0501` | 5 | S. 19, Kraft-Verformung / Verspannungsdreieck | Source page assigned |
| `ft1101`–`ft1103` | 11 label | S. 61, 4.5.1 Fügegeometrien und Festigkeit | Statements are source-supported, but the remembered Q11 mismatch remains open; see below |
| `ft1201`–`ft1202` | 12 | S. 75, 5.4 Schweißtechnisches Dreieck | Source page assigned |
| `ft1301`–`ft1302` | 13 | S. 75–76, 5.4 | Source page assigned |
| `ft1401`–`ft1402` | 14 | S. 79–80, 5.4.1.4 / Schaeffler-Diagramm | Source page assigned |
| `ft1501` | 15 | S. 97, Tabelle 10 | Corrected to all five listed MSG arc types, including Langlichtbogen |
| `ft1601`–`ft1602` | 16 | S. 91, 5.6.1.2 / Abbildung 92 | `ft1601` aligned to the remembered drawing task; axes, falling machine characteristic, short arc and long arc are source-grounded; `ft1602` remains a supplemental characteristic check |
| `ft1801`–`ft1803` | 18 | S. 97–98, 5.6.1.3 | Source page assigned |
| `ft1901`–`ft1902` | 19 | S. 72–73, 5.3 / Wärmeeinflusszone | Source page assigned to the joint-region and HAZ-subdivision cards |
| `ft2101` | 21 | S. 113, 5.7.1 Mechanisch-technologische Verfahren | The page supports the test context and differing properties across weld metal, HAZ and base material, but does not establish the remembered wording as a unique “preferred zone”; Q21 remains open |
| `ft2501` | 25 | S. 76–77, 5.4.1.1 | Source page assigned |
| `ft2601` | 26 | S. 77, 5.4.1.1 | Corrected from generic CE/CEV notation to the script-specific Kohlenstoffäquivalent `K` |
| `ft2701` | 27 | S. 73–76, ZTU/Abkühlverhalten and 5.4.1.1 | Corrected to the directly supported chain: increasing carbon content raises hardenability/hard-cracking risk; rapid cooling promotes martensitic hardening. Unsupported hydrogen/stress prerequisites were removed from the expected answer |
| `ft3101`–`ft3102` | 31 | S. 102–103, Elektronenstrahlschweißen | Source page assigned |

## Confirmed exam-memory mismatch: question 11

The memory protocol asks, in substance, why clinching is not used in highly dynamic areas such as automotive applications and which process can be used instead.

The current `ft1101`–`ft1103` cards instead cover three statements from script page 61:

- why a general analytical strength estimate for clinched joints is difficult;
- that adhesive in the joint can increase fatigue strength;
- that adhesive can additionally seal the joint.

Those statements are useful and source-supported, but they are **not sufficient evidence for the remembered Q11 answer**. No substitute process is added until an approved source supports it. The cards remain in the catalog, but Q11 must stay on the editorial review list.

## Question 21 remains wording-ambiguous

The memory protocol asks which microstructure zone is preferred for a mechanical-technological joining/test procedure. Script page 113 explains that strength and toughness differ between weld metal, heat-affected zone and base material and lists mechanical-technological test methods. It does not designate one of those zones as the uniquely preferred answer to the remembered wording.

`ft2101` therefore remains useful source-supported learning content about the heat-affected zone, but it must not be treated as proof that the remembered Q21 has been conclusively reconstructed. Q21 stays on the editorial review list until stronger approved evidence is available.

## Question 24 remains only partially grounded

The remembered Q24 asks how increasing carbon content affects strength, hardness and elongation. The script directly supports increasing carbon content as a driver of hardenability/hard-cracking risk and links carbon content to steel strength in the weldability discussion, but the current audit has not found a single approved passage that establishes the full three-part expected direction (`strength ↑`, `hardness ↑`, `elongation ↓`) as used by `ft2401`.

Q24 therefore remains open rather than inheriting evidence from Q27 or generic materials knowledge.

## Image/diagram-dependent exam evidence

The memory protocol explicitly relies on an image or supplied diagram for several tasks, including questions 6, 8, 17, 20, 29, 36, 40 and 45. Some other questions ask the learner to draw a diagram themselves and do not necessarily require an imported exam asset.

Q16 is such a learner-drawn task: the expected construction is source-grounded from script figure 92, but the source figure itself does not need to be redistributed as an exam asset.

The repository must not synthesize or copy an unapproved substitute image merely to close the 1.0 catalog gate. These tasks remain dependent on approved local assets or an explicitly approved source-safe reconstruction.

## Historical point distribution

Verified from the memory protocol:

- 57 subtasks in total;
- 202 points in total.

Not yet verified:

- the exact point value for each remembered question/subtask;
- whether every current runtime card's `points` value reproduces the historical exam weighting.

Therefore the roadmap/issue item `Validate historical task and point distribution` remains open.

## Next source-audit slices

Prioritize questions whose current runtime answers can materially affect exam preparation:

1. Q11 — source-supported reason for the high-dynamic limitation and the explicitly intended substitute process.
2. Q21 — resolve the ambiguous remembered wording without inferring a uniquely preferred microstructure zone from insufficient evidence.
3. Q24 — find direct approved evidence for the complete strength/hardness/elongation relationship or narrow the runtime answer accordingly.
4. Q30–Q45 — finish exact page/section mapping, then leave only genuinely asset-dependent warnings open.
