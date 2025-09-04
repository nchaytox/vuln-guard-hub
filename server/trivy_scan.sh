#!/bin/bash
echo "📦 Lancement d’un scan Trivy sur le dossier $1"
trivy fs --format json $1 > result.json
echo "✅ Résultat enregistré dans result.json"
