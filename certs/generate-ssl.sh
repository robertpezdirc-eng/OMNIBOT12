#!/bin/bash
# 🔹 Omni Ultimate Turbo Flow System - SSL Certificate Generator
# Skripta za generiranje self-signed SSL certifikatov za development

echo "🔒 Generiranje SSL certifikatov za Omni Ultimate Turbo Flow System..."

# Ustvari self-signed certifikat za development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni Ultimate/OU=IT Department/CN=localhost"

# Nastavi pravilne pravice
chmod 600 key.pem
chmod 644 cert.pem

echo "✅ SSL certifikati uspešno generirani:"
echo "   - cert.pem (javni certifikat)"
echo "   - key.pem (privatni ključ)"
echo ""
echo "⚠️  OPOZORILO: To so self-signed certifikati za development!"
echo "   Za produkcijo uporabi certifikate od priznane CA (Let's Encrypt, itd.)"
echo ""
echo "🔧 Za uporabo v Docker:"
echo "   - Certifikati so že nastavljeni v docker-compose.yml"
echo "   - Nastavi SSL_ENABLED=true v .env datoteki"