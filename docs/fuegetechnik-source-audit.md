# Fügetechnik source audit

Date: 2026-08-07

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
| `ft01a1`–`ft01c3`, `ft01d2`–`ft01d3` | 1 (partial) | S. 3 joining classification; S. 12/19 screw connection; S. 39 and 58–60 forming/clinching | Welding, soldering and clinching classifications plus screw transverse friction and removability are source-grounded. The remembered axial screw-direction classification in `ft01d1` remains open |
| `ft0201`–`ft0203` | 2 | S. 16, 3.3.1 Festigkeitsklassen | Corrected the earlier off-by-one page mapping from S. 17 to the printed S. 16 |
| `ft0301`–`ft0303` | 3 | S. 16, 3.3.1 Festigkeitsklassen + remembered Q3 inputs | The script establishes the 8.9 strength-class calculation; the memory protocol supplies 400 kN and 40 mm². Arithmetic and integer rounding then yield 28.8 kN per screw and 14 screws |
| `ft0401`–`ft0405` | 4 | S. 19–20, 3.4.1 Vorspannkraft | FMmin components, formula and meanings source-grounded |
| `ft0501`–`ft0503` | 5 | S. 18–20, 3.4.1 Kraft-Verformungsschaubild / Verspannungsdreieck | Drawing basis, spring interpretation and differing deformations source-grounded |
| `ft0701`–`ft0706` | 7 | S. 58, advantages of sheet-metal joining by forming | All listed economic/technical advantages source-grounded |
| `ft1101`–`ft1103` | 11 label | S. 61, 4.5.1 Fügegeometrien und Festigkeit | Statements are source-supported, but the remembered Q11 mismatch remains open; see below |
| `ft1201`–`ft1202` | 12 | S. 75, 5.4 Schweißtechnisches Dreieck | Source page assigned |
| `ft1301`–`ft1302` | 13 | S. 75–76, 5.4 | Source page assigned |
| `ft1401`–`ft1402` | 14 | S. 79–80, 5.4.1.4 / Schaeffler-Diagramm | Source page assigned |
| `ft1501` | 15 | S. 97, Tabelle 10 | Corrected to all five listed MSG arc types, including Langlichtbogen |
| `ft1601`–`ft1602` | 16 | S. 91, 5.6.1.2 / Abbildung 92 | `ft1601` aligned to the remembered drawing task; axes, falling machine characteristic, short arc and long arc are source-grounded; `ft1602` remains a supplemental characteristic check |
| `ft1801`–`ft1803` | 18 | S. 97–98, 5.6.1.3 | Source page assigned |
| `ft1901`–`ft1902` | 19 | S. 72–73, 5.3 / Wärmeeinflusszone | Source page assigned to the joint-region and HAZ-subdivision cards |
| `ft2101` | 21 | S. 113, 5.7.1 Mechanisch-technologische Verfahren | The page supports the test context and differing properties across weld metal, HAZ and base material, but does not establish the remembered wording as a unique “preferred zone”; Q21 remains open |
| `ft2201`–`ft2203` | 22 | S. 73–74, ZTU and t8/5; S. 76 crack-risk context | t8/5 verified as the 800→500 °C cooling time. Short/long cooling answers narrowed to the directly visible ZTU shifts; unsupported grain-growth extension removed |
| `ft2301`–`ft2303` | 23 | S. 73–74, Abbildung 81 ZTU; S. 76 crack-risk context | Figure 81 directly supports the F/P → Zw → M progression with increasing cooling rate; hardness and hard-cracking statements narrowed to the documented cooling/structure relationship |
| `ft2501` | 25 | S. 76–77, 5.4.1.1 | Source page assigned |
| `ft2601` | 26 | S. 77, 5.4.1.1 | Corrected from generic CE/CEV notation to the script-specific Kohlenstoffäquivalent `K` |
| `ft2701` | 27 | S. 73–76, ZTU/Abkühlverhalten and 5.4.1.1 | Corrected to the directly supported chain: increasing carbon content raises hardenability/hard-cracking risk; rapid cooling promotes martensitic hardening. Unsupported hydrogen/stress prerequisites were removed from the expected answer |
| `ft2801` | 28 | S. 104, 5.6.2 Pressschweißverfahren | Corrected to the source definition: below the melting limit, with partial heating and joining forces |
| `ft3101`–`ft3102` | 31 | S. 102–103, Elektronenstrahlschweißen | Source page assigned |
| `ft3201` | 32 | S. 101–102, Laser- und Elektronenstrahlschweißen | Narrowed to the directly supported comparison: laser welding is used throughout automated systems, whereas electron-beam generation and high-vacuum systems add vacuum-chamber and evacuation overhead |
| `ft3301` | 33 | S. 100, Tabelle 11 | Source page assigned; CO₂ laser wavelength verified as 10.6 µm |
| `ft3501` | 35 (partial) | S. 154, 7.1 / DIN 16920 | `Klebstoff` definition source-grounded; the separate remembered `Kleber` distinction remains open |
| `ft3701` | 37 | S. 155–156, 7.2.1 / Youngsche Gleichung | Source page assigned |
| `ft3801`–`ft3802` | 38 | S. 160–163, 7.4.1–7.4.3 | Three reaction classes source-grounded; examples narrowed to Cyanacrylat, Epoxidharz and Silikon as explicitly listed examples |
| `ft3901`–`ft3902` | 39 | S. 157–159, 7.3.1–7.3.2 | Advantages source-grounded; disadvantages narrowed to surface preparation, temperature range and peel/line-loading limitations |
| `ft4201` | 42 | S. 69–70, 5.2 / definitions of welding and soldering | Corrected to the source-level distinction: solder melts while the base material is wetted but not melted; welding is defined more generally through heat and/or force |
| `ft4401`–`ft4402` | 44 | S. 133 and 149–150, flux and solder-joint preparation | Oxide removal narrowed to mechanical/chemical cleaning plus flux action; unsupported “shielding gas/vacuum removes the oxide” was removed. Flux-residue corrosion and required cleanup are source-grounded |

## Question 1 remains partially grounded

The memory protocol asks for type of cohesion, joining group and removability for electron-beam welding, soldering, clinching and a screw connection in horizontal and vertical directions.

The source directly supports the welding, soldering and forming classifications and their removability rules. It also defines a screw connection as a removable force-fit connection and explicitly uses clamping-force friction to transmit transverse forces. Those cards now carry source metadata. The previous blanket `unlösbar` answer for soldering was narrowed to the script's more precise statement that soldered joints are generally removable only with damage, but in some cases can be released without damage.

The current `ft01d1` answer, however, identifies the axial screw effect as `Formschluss des Gewindes`. The audited script explains the axial operating-force behavior and the screw thread, but it does not directly classify this remembered directional subtask as form fit strongly enough to close the evidence gap. `ft01d1` therefore deliberately remains without `sourcePage` metadata.

## Question 3 uses split provenance

The script does not contain the remembered pressure-vessel exercise itself. It establishes how the screw property class determines tensile strength and yield strength on printed S. 16. The memory protocol independently establishes the Q3 task inputs: 400 kN total force, property class 8.9 and 40 mm² cross-section per screw.

The runtime answer therefore intentionally combines these two approved sources: class 8.9 gives 720 N/mm² yield strength, which gives 28.8 kN for 40 mm²; 400/28.8 = 13.89, so a discrete screw count must be rounded upward to 14. This arithmetic is derived, not presented as a quotation from either source.

## Questions 9 and 10 remain source-open

The memory protocol asks in Q9 for two challenges when joining two CFK sheets with semi-tubular self-piercing rivets and for an alternative joining process. The script confirms use of semi-tubular self-piercing rivets with metal and composite components and explains the undercut/form-fit mechanism, but the audited source does not directly establish the current CFK-specific expected terms `spröde`, `Delamination`, `Faserschädigung` or the proposed adhesive alternative. `ft0901`–`ft0903` therefore remain without source-page metadata.

Q10 asks the learner to draw a clinch force-displacement curve with a tolerance band and a qualitatively poor curve. The audited clinching section describes process geometry, strength and mixed-material behavior, but no directly matching force-displacement/tolerance-band evidence was found. `ft1001` and `ft1002` remain source-open rather than borrowing unrelated process-monitoring evidence.

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

## Question 34 remains only generally grounded

The current Q34 card asks specifically why copper is problematic with a CO₂ laser. The script clearly states that metallic materials have sharply decreasing absorption above roughly 1 µm and that the long-wavelength CO₂ laser has a low absorption rate in metal. It does **not**, in the audited passage, establish a copper-specific absorption/reflection statement strong enough to make copper itself the verified discriminator.

Q34 therefore remains open. Generic CO₂/metal absorption evidence must not be promoted into a copper-specific expected answer without a direct approved source.

## Question 35 remains partially grounded

Script S. 154 defines `Klebstoff` as a nonmetallic substance capable of connecting parts through adhesion and cohesion. The audit has not found an approved script passage that separately defines `Kleber` as the cured or hardened adhesive in the way `ft3502` currently does.

`ft3501` is therefore source-grounded, while `ft3502` deliberately keeps its missing-source warning and Q35 remains editorially open as a whole.

## Question 41 remains only partially grounded

Script S. 159 requires adhesive joints to be loaded in shear where possible and warns that line loading creates inadmissibly high stress peaks and progressive peeling. This supports the importance of shear versus peel-type loading, but it does not establish the complete current `ft4101` statement that an overlapped adhesive joint consists of shear plus peel/normal stresses specifically peaking at the overlap ends.

`ft4101` therefore keeps its missing-source warning until an approved source directly supports the full stress-distribution statement.

## Question 43 remains only partially grounded

The script states in the aluminium welding section that aluminium carries an always-present, high-melting oxide skin. The soldering section independently requires oxide-free surfaces and explains that flux removes/reduces oxides so wetting can occur. The audited script passage does not directly state the current aluminium-soldering answer that an aluminium-oxide layer itself prevents solder wetting, nor the more specific `ft4302` claims about rapid reoxidation and melting-temperature contrast.

`ft4301` and `ft4302` therefore keep their missing-source warnings rather than combining two contexts into a stronger claim than the approved source explicitly makes.

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

1. Q1d1 — find direct approved evidence for the axial screw-direction classification or narrow/remove the current form-fit answer.
2. Q9/Q10 — obtain direct approved CFK/self-piercing-rivet and clinch force-displacement/tolerance-band evidence; do not infer from generic composite or process-monitoring knowledge.
3. Q11 — source-supported reason for the high-dynamic limitation and the explicitly intended substitute process.
4. Q21 — resolve the ambiguous remembered wording without inferring a uniquely preferred microstructure zone from insufficient evidence.
5. Q24 — find direct approved evidence for the complete strength/hardness/elongation relationship or narrow the runtime answer accordingly.
6. Q30/Q34 — verify the aluminium resistance-spot-welding specifics and obtain a copper-specific CO₂-laser source rather than relying on generic material statements.
7. Q35/Q41/Q43 — find direct approved evidence for the remaining terminology and stress/oxide claims or narrow/remove those runtime cards.
8. Q45 — keep asset-dependent until the approved diagram is available.
