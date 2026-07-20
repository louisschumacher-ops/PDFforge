Epic / User Story: Generierung einer skalierbaren PDF-Dokumentation aus einem NodeEditor-Workflow

Ziel

Als Anwender möchte ich einen im NodeEditor erstellten Workflow als hochwertiges PDF exportieren können, sodass der gesamte Netzaufbau unabhängig vom Editor in einer strukturierten, druckbaren und nachvollziehbaren Form dargestellt wird.

Dabei handelt es sich nicht um einen Screenshot oder eine Übernahme der Editoransicht. Stattdessen wird aus der JSON-Datei ein vollständig neues, semantisches Layout erzeugt, das sich an der logischen Struktur des Netzwerks orientiert und unabhängig von Bildschirmauflösung, Zoom oder den im Editor gespeicherten Positionen funktioniert.

⸻

Ausgangsbasis

Die Grundlage bildet die JSON-Ausgabe des NodeEditors.

Aus dieser werden ausschließlich die logischen Informationen übernommen, beispielsweise:

- Nodes
- Verbindungen
- Node-Typen
- Gruppen
- Metadaten
- weitere fachliche Informationen

Die in der JSON enthaltenen X-/Y-Koordinaten oder sonstigen Layoutinformationen werden vollständig ignoriert.

Die PDF erzeugt ihr eigenes Layout ausschließlich anhand der logischen Struktur des Netzwerks.

⸻

Architektur

Die Verarbeitung erfolgt in mehreren klar getrennten Schritten:

1. Einlesen der JSON-Datei
2. Aufbau eines logischen Graphen
3. Ermittlung der Hierarchie ausgehend von einer Root-Node
4. Erzeugung eines virtuellen Grids
5. Berechnung sämtlicher Node-Positionen
6. Routing aller Verbindungslinien
7. Pagination
8. Rendering der PDF

Diese Verantwortlichkeiten sind voneinander getrennt, sodass einzelne Komponenten unabhängig erweitert oder ausgetauscht werden können.

⸻

Root-Node

Der Aufbau beginnt immer an einer eindeutig definierten Root-Node.

Diese wird innerhalb der Layout-Engine als n1 bezeichnet und stellt den Ursprung des gesamten Graphen dar.

Die fachliche Bedeutung dieser Node (z. B. Netzanschlusspunkt) ist für die Layout-Engine unerheblich. Entscheidend ist lediglich, dass sie als Wurzel des Layouts dient.

Von n1 aus wird die gesamte Hierarchie rekursiv aufgebaut.

- n1 wird immer in der ersten Zeile des Grids platziert.
- Alle nachgelagerten Nodes werden entsprechend ihrer logischen Tiefe in den folgenden Zeilen angeordnet.
- Geschwister-Nodes derselben Ebene werden horizontal nebeneinander positioniert.
- Die gesamte Struktur wird ausschließlich anhand der Verbindungen zwischen den Nodes berechnet.

⸻

Automatische Layout-Engine

Das Layout orientiert sich ausschließlich an den Verbindungen zwischen den Nodes.

Die Positionen werden automatisch berechnet.

Es erfolgt keinerlei Übernahme der Editor-Positionen.

⸻

Vertikale Struktur

Die vertikale Position einer Node ergibt sich ausschließlich aus ihrer logischen Tiefe.

Beispiel:

Zeile 1

Netzanschlusspunkt

↓

Zeile 2

Transformator

↓

Zeile 3

Niederspannungshauptverteilung

↓

Zeile 4

Verbraucher

Jede weitere Ebene erhöht die Zeilennummer um genau eins.

⸻

Horizontale Struktur

Besitzt eine Node mehrere nachgelagerte Elemente, werden diese nebeneinander dargestellt.

Beispiel:

Zeile 1

Netzanschlusspunkt

↓

Zeile 2

Transformator

↓

Zeile 3

Niederspannungshauptverteilung

↓

Zeile 4

Verbraucher | PV-Anlage | Batteriespeicher

Alle Nodes derselben Hierarchieebene befinden sich in derselben Zeile.

Dadurch entsteht automatisch ein übersichtlicher Baum.

⸻

Virtuelles Grid

Vor dem eigentlichen Rendering wird ein vollständig virtuelles Grid erzeugt.

Das Grid bildet die Grundlage sämtlicher Berechnungen.

Spalten werden alphabetisch bezeichnet:

A
B
C
D
…

Zeilen werden numerisch bezeichnet:

1
2
3
4
…

Jede Node erhält genau ein Grid-Feld.

Alle Positionen werden ausschließlich über dieses Grid bestimmt.

⸻

Skalierung

Das komplette Rendering basiert auf einem zentralen Skalierungsfaktor.

Von diesem Faktor hängen unter anderem ab:

- Gridgröße
- Nodegröße
- Schriftgrößen
- Linien
- Pfeile
- Gruppen
- Abstände
- Pagination

Als Referenz dient ein Maßstab von 100 %.

Dieser entspricht einer optimalen Darstellung auf einer A4-Seite.

Größere oder kleinere Zoomstufen verändern proportional sämtliche Elemente.

Es existieren keine fest codierten Größen innerhalb einzelner Komponenten.

⸻

Unterstützung verschiedener Papierformate

Das Rendering muss unabhängig vom Papierformat funktionieren.

Unter anderem:

- A5
- A4
- A3
- Letter
- Legal
- Portrait
- Landscape

Das Layout bleibt identisch.

Lediglich Skalierung und Pagination ändern sich automatisch.

⸻

Seitenränder

Das Grid nutzt niemals die vollständige Seitenfläche.

Jede Seite besitzt individuell konfigurierbare Seitenränder.

Es existieren getrennte Werte für:

- oben
- unten
- links
- rechts

Diese definieren die nutzbare Zeichenfläche.

Alle Layout- und Pagination-Berechnungen erfolgen ausschließlich innerhalb dieser Fläche.

⸻

Darstellung der Nodes

Jede Node wird innerhalb ihres Grid-Feldes dargestellt.

Grundsätzlich bleiben erhalten:

- Titel
- Typ
- Metadaten
- Farben (falls verwendet)
- Ein- und Ausgänge

Die tatsächliche Darstellung ist abhängig vom Rendering-Modus.

⸻

Development Mode

Für die Entwicklung wird ein spezieller Rendering-Modus bereitgestellt.

In diesem Modus werden Nodes bewusst technisch dargestellt.

Eine Node besteht aus:

- einem einfachen Rahmen
- einer eindeutigen Beschriftung
- allen sichtbaren Anschlusspositionen
- einer klaren Position innerhalb des Grid-Feldes

Dadurch lässt sich das automatische Layout einfach überprüfen.

⸻

Production Mode

Im Produktivmodus wird dieselbe Layout-Engine verwendet.

Lediglich die Darstellung der Nodes ändert sich.

Die technische Darstellung wird durch das finale Symbol ersetzt.

Das Symbol wird mittig innerhalb des Grid-Feldes positioniert.

Die Anschlusspositionen bleiben intern erhalten, sind jedoch nicht sichtbar.

Ein Wechsel zwischen beiden Modi verändert ausschließlich die Darstellung.

Das Layout bleibt vollständig identisch.

⸻

Verbindungen

Alle Verbindungen werden anhand der logischen Struktur neu berechnet.

Die ursprünglichen Editor-Koordinaten spielen keine Rolle.

Die Verbindungslinien sollen:

- eindeutig nachvollziehbar sein
- möglichst wenige Kreuzungen besitzen
- sauber an den Anschlusspositionen beginnen und enden
- Pfeilrichtungen korrekt darstellen

⸻

Gruppen

Vorhandene Gruppen werden übernommen.

Gruppen besitzen:

- gemeinsamen Rahmen
- Titel
- Hintergrund
- Innenabstände

Wenn möglich, bleiben Gruppen vollständig auf einer Seite.

⸻

Pagination

Die Pagination erfolgt erst nach Abschluss der vollständigen Layout-Berechnung.

Zunächst entsteht ein vollständiges virtuelles Gesamtlayout.

Erst anschließend wird dieses Layout auf mehrere Seiten verteilt.

Dabei gelten folgende Regeln:

- Nodes dürfen niemals geteilt werden.
- Gruppen sollen möglichst zusammenbleiben.
- Zusammenhängende Teilbäume sollen möglichst nicht getrennt werden.
- Seitenumbrüche erfolgen möglichst an logischen Stellen.

⸻

Seitenübergreifende Verbindungen

Verbindungen dürfen Seiten überschreiten.

In diesem Fall werden automatisch Navigationshinweise erzeugt.

Beispielsweise:

→ Fortsetzung auf Seite 5

← Fortsetzung von Seite 3

Diese Hinweise sind gleichzeitig PDF-Hyperlinks.

Ein Klick springt unmittelbar zur entsprechenden Zielseite.

Diese Funktion gehört ausdrücklich zum MVP.

⸻

Hintergrundgrid

Jede Seite besitzt ein dezentes Orientierungsgitter.

Eigenschaften:

- sehr helles Grau
- nicht dominant
- ausschließlich zur Orientierung

Spalten erhalten ihre alphabetische Kennzeichnung.

Zeilen erhalten ihre numerische Kennzeichnung.

Die Beschriftungen sollen lieber größer als dunkler dargestellt werden.

Das Grid darf niemals die eigentlichen Inhalte überlagern.

⸻

Erweiterbarkeit

Die Architektur soll modular aufgebaut werden.

Spätere Erweiterungen sollen ohne grundlegende Änderungen möglich sein.

Beispiele:

- Themes
- unterschiedliche Symbolbibliotheken
- Firmenlogos
- Kopf- und Fußzeilen
- Wasserzeichen
- Inhaltsverzeichnis
- Legenden
- SVG-Export
- PNG-Export

⸻

Nichtfunktionale Anforderungen

- Auch große Netzwerke mit mehreren hundert Nodes sollen performant verarbeitet werden.
- Sämtliche Berechnungen müssen deterministisch sein.
- Das Layout muss bei identischen Eingabedaten reproduzierbar sein.
- Die Komponenten Parser, Layout, Grid, Routing, Pagination und Rendering sind sauber voneinander getrennt.
- Das PDF muss sowohl für den Ausdruck als auch für die digitale Nutzung optimiert sein.

⸻

Akzeptanzkriterien

> Status-Audit (2026-07-20): ✅ = implementiert und getestet, ⏳ = noch offen.

- ✅ Die JSON-Datei des NodeEditors kann vollständig eingelesen werden.
- ✅ Positionen aus dem NodeEditor werden vollständig ignoriert.
- ✅ Das Layout wird ausschließlich aus den logischen Verbindungen erzeugt.
- ✅ Der Netzanschlusspunkt bildet die Root-Node des Layouts.
- ✅ Jede Hierarchieebene entspricht genau einer Grid-Zeile.
- ✅ Parallel angeschlossene Nodes werden horizontal nebeneinander angeordnet.
- ✅ Jede Node wird genau einem Grid-Feld zugeordnet.
- ✅ Das Grid ist vollständig skalierbar.
- ✅ Alle Größen werden ausschließlich über den globalen Skalierungsfaktor berechnet.
- ✅ Das Layout funktioniert unabhängig vom Papierformat (Ausnahme: siehe horizontale Pagination unten).
- ✅ Seitenränder sind getrennt konfigurierbar und werden bei allen Berechnungen berücksichtigt.
- ⏳ Es existieren ein Development Mode und ein Production Mode mit identischem Layout, aber unterschiedlicher Darstellung der Nodes. Aktuell existiert nur der Development Mode (`renderDevPdf`); Production Mode mit Symbol-Registry ist noch nicht gebaut.
- ✅ Alle Verbindungen werden automatisch berechnet und korrekt dargestellt.
- ✅ Gruppen werden möglichst vollständig zusammengehalten.
- ✅ Die Pagination erfolgt erst nach Abschluss des Gesamtlayouts.
- ✅ Seitenübergreifende Verbindungen werden automatisch erkannt.
- ✅ Für jede seitenübergreifende Verbindung werden funktionierende PDF-Hyperlinks erzeugt.
- ✅ Jede PDF-Seite besitzt ein dezentes Hintergrundgrid mit Zeilen- und Spaltenbeschriftung.
- ✅ Das Ergebnis ist ein hochwertiges, druckbares und reproduzierbares PDF, das die logische Struktur des Netzwerks übersichtlich und konsistent darstellt.

⸻

Horizontale Pagination

Neben der vertikalen Pagination, bei der zu hohe Hierarchien zeilenweise auf mehrere Seiten verteilt werden, muss dasselbe Prinzip auch in horizontaler Richtung gelten.

Besitzt eine Zeile mehr Geschwister-Nodes, als Spalten innerhalb des konfigurierten Papierformats zur Verfügung stehen, dürfen diese Nodes nicht abgeschnitten werden oder außerhalb der bedruckbaren Fläche landen. Stattdessen wird die Zeile an einer logischen Spaltengrenze getrennt und auf mehrere, horizontal aneinander anschließende Seiten verteilt.

Dabei gelten dieselben Grundsätze wie bei der vertikalen Pagination:

- Eine einzelne Node darf niemals horizontal geteilt werden. Der Seitenumbruch erfolgt ausschließlich zwischen zwei Spalten, niemals innerhalb einer Node.
- Gruppen sollen auch horizontal möglichst nicht zerschnitten werden. Wenn eine Gruppe innerhalb einer Zeile zusammenhängt, bleibt sie nach Möglichkeit auf einer Seite, statt über die horizontale Seitengrenze hinweg aufgeteilt zu werden.
- Für Verbindungen, die durch die horizontale Aufteilung auf unterschiedlichen Seiten landen, werden dieselben Navigationshinweise wie bei der vertikalen Pagination erzeugt, beispielsweise:

→ Fortsetzung auf Seite 6

← Fortsetzung von Seite 4

Diese Hinweise gelten nun ausdrücklich auch für horizontal benachbarte Nodes, etwa wenn ein Geschwister-Element auf die rechts angrenzende Seite verschoben wird. Auch diese Hinweise sind PDF-Hyperlinks und springen bei Klick unmittelbar zur Zielseite.

Vertikale und horizontale Pagination müssen gemeinsam funktionieren. Ein hinreichend großes Netzwerk kann in beiden Richtungen gleichzeitig zu groß für eine einzelne Seite sein. In diesem Fall entsteht aus dem virtuellen Gesamtlayout ein rasterartiges Geflecht aus Seiten, vergleichbar mit einer Kachelung in Zeilen und Spalten von Seiten. Seitenübergreifende Verbindungen müssen in diesem Raster unabhängig von der relativen Lage der Zielseite korrekt funktionieren, unabhängig davon, ob sich die Zielseite oberhalb, unterhalb, links, rechts oder diagonal zur Ausgangsseite befindet.

⸻

Ergänzende Akzeptanzkriterien (Horizontale Pagination)

> Status-Audit (2026-07-20): Dieser gesamte Abschnitt ist ⏳ spezifiziert, aber noch nicht
> implementiert. `src/pagination` schneidet aktuell ausschließlich zeilenweise (vertikal);
> eine Zeile mit mehr Nodes als Spalten im konfigurierten Papierformat wird derzeit nicht
> auf mehrere Seiten verteilt, sondern rendert einfach über die bedruckbare Breite hinaus.

- ⏳ Zeilen mit mehr Nodes, als Spalten pro Seite zur Verfügung stehen, werden automatisch auf mehrere, horizontal aneinander anschließende Seiten verteilt.
- ⏳ Eine Node wird niemals horizontal geteilt; der Seitenumbruch erfolgt ausschließlich zwischen zwei Spalten.
- ⏳ Gruppen werden auch bei horizontaler Aufteilung möglichst vollständig zusammengehalten.
- ⏳ Für horizontal seitenübergreifende Verbindungen werden automatisch Navigationshinweise mit funktionierenden PDF-Hyperlinks erzeugt, analog zur vertikalen Pagination.
- ⏳ Vertikale und horizontale Pagination funktionieren gleichzeitig und erzeugen bei Bedarf ein zusammenhängendes Raster mehrerer Seiten.
- ⏳ Seitenübergreifende Verbindungen funktionieren korrekt unabhängig davon, ob die Zielseite oberhalb, unterhalb, links, rechts oder diagonal zur Ausgangsseite liegt.
