import type { CardVersion, Catalog } from './model';

const at = '2026-07-25T08:00:00.000Z';
const source = 'Fuegetechnikskript_SoSe2026.pdf / Gedächtnisprotokoll Fügetechnik SS24';
const card = (id:string, topicId:string, examQuestion:string, prompt:string, modelAnswer:string, requiredTerms:string[]=[], points=2):CardVersion => ({
  id:`ft${id}`, version:1, status:'released', topicId, examQuestion, prompt, points,
  difficulty:2, tags:[], questionType:'free_text', answer:{modelAnswer, requiredTerms}, source, changedAt:at
});

const cards:CardVersion[] = [
  card('01a1','Grundlagen','1a','Art des Zusammenhalts beim Elektronenstrahlschweißen?','Stoffschluss.',['Stoffschluss']),
  card('01a2','Grundlagen','1a','Fügegruppe des Elektronenstrahlschweißens?','Fügen durch Schweißen.',['Schweißen']),
  card('01a3','Grundlagen','1a','Lösbarkeit einer Elektronenstrahlschweißverbindung?','Unlösbar; Trennung nur zerstörend.',['unlösbar']),
  card('01b1','Grundlagen','1b','Art des Zusammenhalts beim Löten?','Stoffschluss.',['Stoffschluss']),
  card('01b2','Grundlagen','1b','Fügegruppe des Lötens?','Fügen durch Löten.',['Löten']),
  card('01b3','Grundlagen','1b','Lösbarkeit einer Lötverbindung?','Unlösbar.',['unlösbar']),
  card('01c1','Umformen','1c','Art des Zusammenhalts beim Durchsetzfügen?','Formschluss.',['Formschluss']),
  card('01c2','Umformen','1c','Fügegruppe des Durchsetzfügens?','Fügen durch Umformen.',['Umformen']),
  card('01c3','Umformen','1c','Lösbarkeit einer Durchsetzfügeverbindung?','Nur mit Veränderung, Schädigung oder Zerstörung lösbar.',['Schädigung','Zerstörung']),
  card('01d1','Schrauben','1d','Welche Wirkung sichert eine Schraube axial?','Formschluss des Gewindes.',['Formschluss','Gewinde']),
  card('01d2','Schrauben','1d','Welche Wirkung überträgt Querkräfte zwischen geklemmten Teilen?','Kraftschluss beziehungsweise Reibschluss.',['Kraftschluss','Reibschluss']),
  card('01d3','Schrauben','1d','Ist eine Schraubenverbindung lösbar?','Ja, in der Regel zerstörungsfrei lösbar.',['lösbar']),
  card('0201','Schrauben','2','Welche Kennwerte ergeben sich aus der Schrauben-Festigkeitsklasse?','Nennzugfestigkeit Rm und Streckgrenze beziehungsweise Rp0,2.',['Nennzugfestigkeit','Streckgrenze']),
  card('0202','Schrauben','2','Formel für Rm aus x.y?','Rm = 100 · x N/mm².',['100','x']),
  card('0203','Schrauben','2','Formel für Re aus x.y?','Re = 10 · x · y N/mm².',['10','x','y']),
  card('0301','Schrauben','3','Kraft je Schraube 8.9 bei 40 mm² und Ansatz Re?','720 N/mm² · 40 mm² = 28,8 kN.',['720','40','28,8'],3),
  card('0303','Schrauben','3','Warum 13,89 Schrauben aufrunden?','Nur ganze Schrauben sind möglich; Abrunden unterschreitet die nötige Tragfähigkeit.',['aufrunden','Tragfähigkeit']),
  card('0401','Schrauben','4','Drei Bestandteile von FMmin?','FKerf, FZ und FPA.',['FKerf','FZ','FPA']),
  card('0402','Schrauben','4','Formel für FMmin?','FMmin = FKerf + FZ + FPA.',['FMmin','FKerf','FZ','FPA']),
  card('0403','Schrauben','4','Aufgabe von FKerf?','Zusammenpressen, Reibschluss und gegebenenfalls Dichtpressen unter Betriebskräften.',['Zusammenpressen','Reibschluss','Dichtpressen']),
  card('0404','Schrauben','4','Wodurch entsteht FZ?','Setzen, Relaxation und Temperaturwechsel.',['Setzen','Relaxation','Temperaturwechsel']),
  card('0405','Schrauben','4','Was beschreibt FPA?','Entlastung der verspannten Bauteile durch die axiale Betriebskraft.',['Entlastung','Betriebskraft']),
  card('0502','Schrauben','5','Welche elastischen Systeme zeigt das Verspannungsschaubild?','Schraube als Zugfeder und Bauteile als Druckfeder.',['Zugfeder','Druckfeder']),
  card('0503','Schrauben','5','Warum unterscheiden sich Schraubenlängung und Plattenverkürzung?','Wegen unterschiedlicher Federsteifigkeiten.',['Federsteifigkeiten']),
  card('0701','Umformen','7','Vorteil des Umformfügens bezüglich Zusatzwerkstoffen?','Verbindungen ohne Zusatzwerkstoff bei geringem Materialeinsatz.',['ohne Zusatzwerkstoff','Materialeinsatz']),
  card('0702','Umformen','7','Vorteil des Umformfügens bezüglich Wärme?','Keine thermische Beeinflussung wie beim Schweißen und Löten.',['keine thermische Beeinflussung']),
  card('0703','Umformen','7','Vorteil der Kaltverfestigung?','Sie kann dünnere Wanddicken ermöglichen.',['Kaltverfestigung','dünnere Wanddicken']),
  card('0704','Umformen','7','Weitere Wirkung von Umformverbindungen?','Sie wirken häufig zusätzlich versteifend.',['versteifend']),
  card('0705','Umformen','7','Welche Festigkeit kann erreicht werden?','Bis hin zur Streckgrenze des Werkstoffs.',['Streckgrenze']),
  card('0706','Umformen','7','Nenne drei Vorteile des Fügens durch Umformen.','Geringer Materialeinsatz ohne Zusatzwerkstoff; keine thermische Beeinflussung; Kaltverfestigung beziehungsweise Versteifung.',['Materialeinsatz','thermische Beeinflussung','Kaltverfestigung'],3),
  card('0901','Umformen','9a','Welche Herausforderung besteht beim Halbhohlstanznieten von CFK?','CFK ist spröde; beim Durchdringen können Delamination und Faserschädigung auftreten.',['spröde','Delamination','Faserschädigung']),
  card('0902','Umformen','9a','Welche weitere Herausforderung betrifft den Hinterschnitt in CFK?','Die geringe plastische Verformbarkeit erschwert die Ausbildung eines tragfähigen Hinterschnitts.',['plastische Verformbarkeit','Hinterschnitt']),
  card('0903','Umformen','9b','Welches alternative Verfahren kommt für zwei CFK-Bleche in Betracht?','Kleben, weil keine lokale Durchdringung und starke plastische Umformung erforderlich ist.',['Kleben']),
  card('1002','Umformen','10','Was zeigt ein Verlassen des Toleranzbands im Kraft-Weg-Verlauf?','Eine Prozess- oder Qualitätsabweichung der Clinchverbindung.',['Prozessabweichung','Qualitätsabweichung']),
  card('1101','Umformen','11','Warum ist eine allgemeine rechnerische Festigkeitsabschätzung beim Durchsetzfügen schwierig?','Viele Werkstoff-, Geometrie-, Oberflächen-, Werkzeug- und Prozessparameter beeinflussen die Verbindung.',['Werkstoff','Geometrie','Oberfläche','Werkzeug','Prozess']),
  card('1102','Umformen','11','Welche Maßnahme kann die Dauerfestigkeit beim Durchsetzfügen erhöhen?','Klebstoff im Fügespalt.',['Klebstoff','Fügespalt']),
  card('1103','Umformen','11','Welcher zusätzliche Nutzen kann durch Klebstoff im Fügespalt entstehen?','Eine dichte Verbindung.',['dichte Verbindung'])
];

for (const [id,q,v] of [['0259rm','Rm für 5.9?',500],['0259re','Re für 5.9?',450],['0289rm','Rm für 8.9?',800],['0289re','Re für 8.9?',720],['02129rm','Rm für 12.9?',1200],['02129re','Re für 12.9?',1080],['0302','Mindestanzahl Schrauben 8.9 mit 40 mm² für 400 kN?',14]] as [string,string,number][]) {
  cards.push({...card(id,'Schrauben',id==='0302'?'3':'2',q,String(v),[],id==='0302'?3:1), questionType:'numeric', answer:{modelAnswer:String(v),value:v,tolerance:{type:'absolute',value:0}}});
}

cards.push({...card('0501','Schrauben','5','Zeichne das Verspannungsschaubild.','Schraubenkennlinie, gespiegelte Bauteilkennlinie, Kraft- und Verformungsachse sowie Montagevorspannkraft eintragen.',[],4),questionType:'drawing',answer:{modelAnswer:'Schraubenkennlinie, gespiegelte Bauteilkennlinie, Kraft- und Verformungsachse sowie Montagevorspannkraft eintragen.',criteria:['Schraubenkennlinie','Bauteilkennlinie','Kraftachse','Verformungsachse','Montagevorspannkraft']}});
cards.push({...card('1001','Umformen','10','Zeichne den Kraft-Weg-Verlauf einer Clinchverbindung mit Toleranzband und einer qualitativ schlechten Kurve.','Referenzkurve mit unterer und oberer Toleranzgrenze; schlechte Kurve verlässt das Toleranzband.',[],5),questionType:'drawing',answer:{modelAnswer:'Referenzkurve mit unterer und oberer Toleranzgrenze; schlechte Kurve verlässt das Toleranzband.',criteria:['Kraftachse','Wegachse','Referenzkurve','Toleranzband','Fehlerkurve']}});

export const builtinCatalog:Catalog = {
  catalogId:'fuegetechnik', title:'Fügetechnik', version:'0.4.0',
  description:'Lokaler Pilotkatalog für das Exam Trainer Framework.',
  createdAt:at, updatedAt:at, cards
};
