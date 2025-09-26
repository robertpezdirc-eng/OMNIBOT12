#!/bin/bash

# Generate SSL certificates for Omni Global License System
echo "Generating SSL certificates for Omni Docker environment..."

# Create private key
openssl genrsa -out key.pem 2048

# Create certificate signing request
openssl req -new -key key.pem -out cert.csr -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=Omni/OU=IT/CN=localhost"

# Create self-signed certificate
openssl x509 -req -in cert.csr -signkey key.pem -out cert.pem -days 365

# Set proper permissions
chmod 600 key.pem
chmod 644 cert.pem

# Clean up
rm cert.csr

echo "SSL certificates generated successfully!"
echo "Files created:"
echo "  - cert.pem (certificate)"
echo "  - key.pem (private key)"