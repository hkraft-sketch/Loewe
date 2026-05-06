# Bilder generieren (kie.ai · Nano Banana)

Erzeugt 12 produktspezifische Bilder für die Löwe-Container-Startseite.

## Voraussetzungen

- Node 18 oder neuer (für globales `fetch`)
- kie.ai-Account mit API-Key (https://kie.ai)

## Nutzung

```bash
export KIE_API_KEY=sk-...

# Alle fehlenden Bilder generieren
node scripts/generate-images.mjs

# Nur ausgewählte Bilder
node scripts/generate-images.mjs hero abrollcontainer

# Existierende Bilder neu generieren
FORCE=1 node scripts/generate-images.mjs
```

Die Bilder landen in `images/<slug>.png` und werden von `index.html` automatisch geladen. Solange noch keine Bilder existieren, zeigt die Seite die dunklen Surface-Flächen als Platzhalter — die Seite bleibt also auch ohne ausgeführtes Script vollständig nutzbar.

## Prompts anpassen

Alle Prompts und Stil-Vorgaben stehen in `scripts/prompts.json`. `style` wird an jeden Prompt angehängt, sodass alle Bilder eine konsistente Bildsprache erhalten.

## Kosten (Stand kie.ai)

Nano Banana (Gemini 2.5 Flash Image): ca. $0.02 pro Bild · komplette Generierung der 12 Motive ≈ $0.25.
