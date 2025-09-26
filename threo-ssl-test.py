#!/usr/bin/env python3
"""
🧪 THREO SSL TESTNA SKRIPTA
Testira funkcionalnost univerzalne SSL skripte
"""

import os
import sys
import json
import socket
import ssl
import subprocess
import platform
from datetime import datetime
import urllib.request
import urllib.error

class ThreoSSLTester:
    def __init__(self):
        self.os_type = platform.system().lower()
        self.test_results = {
            "timestamp": datetime.now().isoformat(),
            "os": self.os_type,
            "tests": {}
        }
        
    def test_python_dependencies(self):
        """Testira Python odvisnosti"""
        print("🔍 Testiram Python odvisnosti...")
        
        required_modules = ['ssl', 'socket', 'subprocess', 'json', 'urllib']
        missing_modules = []
        
        for module in required_modules:
            try:
                __import__(module)
                print(f"   ✅ {module}")
            except ImportError:
                print(f"   ❌ {module}")
                missing_modules.append(module)
        
        success = len(missing_modules) == 0
        self.test_results["tests"]["python_dependencies"] = {
            "success": success,
            "missing_modules": missing_modules
        }
        
        return success
    
    def test_admin_privileges(self):
        """Testira admin pravice"""
        print("🔍 Testiram admin pravice...")
        
        try:
            if self.os_type == "windows":
                import ctypes
                is_admin = ctypes.windll.shell32.IsUserAnAdmin()
            else:
                is_admin = os.geteuid() == 0
        except:
            is_admin = False
        
        print(f"   {'✅' if is_admin else '❌'} Admin pravice: {is_admin}")
        
        self.test_results["tests"]["admin_privileges"] = {
            "success": is_admin,
            "has_admin": is_admin
        }
        
        return is_admin
    
    def test_network_connectivity(self):
        """Testira mrežno povezljivost"""
        print("🔍 Testiram mrežno povezljivost...")
        
        test_hosts = [
            ("google.com", 80),
            ("letsencrypt.org", 443),
            ("github.com", 443)
        ]
        
        connectivity_results = {}
        
        for host, port in test_hosts:
            try:
                sock = socket.create_connection((host, port), timeout=5)
                sock.close()
                print(f"   ✅ {host}:{port}")
                connectivity_results[f"{host}:{port}"] = True
            except:
                print(f"   ❌ {host}:{port}")
                connectivity_results[f"{host}:{port}"] = False
        
        success = all(connectivity_results.values())
        self.test_results["tests"]["network_connectivity"] = {
            "success": success,
            "connections": connectivity_results
        }
        
        return success
    
    def test_port_availability(self):
        """Testira dostopnost portov 80 in 443"""
        print("🔍 Testiram dostopnost portov...")
        
        ports_to_test = [80, 443]
        port_results = {}
        
        for port in ports_to_test:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                
                is_open = result == 0
                print(f"   {'✅' if is_open else '❌'} Port {port}: {'Odprt' if is_open else 'Zaprt'}")
                port_results[str(port)] = is_open
                
            except:
                print(f"   ❌ Port {port}: Napaka")
                port_results[str(port)] = False
        
        self.test_results["tests"]["port_availability"] = {
            "success": True,  # Vedno uspešen test, ker je informacijski
            "ports": port_results
        }
        
        return True
    
    def test_ssl_tools_availability(self):
        """Testira dostopnost SSL orodij"""
        print("🔍 Testiram dostopnost SSL orodij...")
        
        tools_results = {}
        
        if self.os_type == "linux":
            # Testira Certbot
            try:
                result = subprocess.run(['which', 'certbot'], capture_output=True, text=True)
                certbot_available = result.returncode == 0
                print(f"   {'✅' if certbot_available else '❌'} Certbot")
                tools_results["certbot"] = certbot_available
            except:
                print("   ❌ Certbot")
                tools_results["certbot"] = False
                
        elif self.os_type == "windows":
            # Testira win-acme
            wacs_path = "C:/win-acme/wacs.exe"
            wacs_available = os.path.exists(wacs_path)
            print(f"   {'✅' if wacs_available else '❌'} win-acme")
            tools_results["win-acme"] = wacs_available
        
        success = any(tools_results.values()) if tools_results else False
        self.test_results["tests"]["ssl_tools"] = {
            "success": success,
            "tools": tools_results
        }
        
        return success
    
    def test_dns_resolution(self, domain="localhost"):
        """Testira DNS resolucijo"""
        print(f"🔍 Testiram DNS resolucijo za {domain}...")
        
        try:
            ip = socket.gethostbyname(domain)
            print(f"   ✅ {domain} -> {ip}")
            
            self.test_results["tests"]["dns_resolution"] = {
                "success": True,
                "domain": domain,
                "ip": ip
            }
            return True
            
        except socket.gaierror as e:
            print(f"   ❌ DNS napaka: {e}")
            self.test_results["tests"]["dns_resolution"] = {
                "success": False,
                "domain": domain,
                "error": str(e)
            }
            return False
    
    def test_ssl_certificate(self, domain="localhost", port=443):
        """Testira SSL certifikat"""
        print(f"🔍 Testiram SSL certifikat za {domain}:{port}...")
        
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
            
            print(f"   ✅ SSL certifikat veljaven")
            print(f"      Izdajatelj: {cert.get('issuer', 'Neznano')}")
            print(f"      Velja do: {cert.get('notAfter', 'Neznano')}")
            
            self.test_results["tests"]["ssl_certificate"] = {
                "success": True,
                "domain": domain,
                "port": port,
                "issuer": cert.get('issuer', 'Neznano'),
                "expires": cert.get('notAfter', 'Neznano')
            }
            return True
            
        except Exception as e:
            print(f"   ❌ SSL certifikat ni dostopen: {e}")
            self.test_results["tests"]["ssl_certificate"] = {
                "success": False,
                "domain": domain,
                "port": port,
                "error": str(e)
            }
            return False
    
    def test_https_response(self, domain="localhost", port=443):
        """Testira HTTPS odziv"""
        print(f"🔍 Testiram HTTPS odziv za {domain}:{port}...")
        
        try:
            url = f"https://{domain}:{port}" if port != 443 else f"https://{domain}"
            
            # Ustvari SSL kontekst, ki ne preverja certifikatov (za testiranje)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            request = urllib.request.Request(url)
            with urllib.request.urlopen(request, context=ssl_context, timeout=10) as response:
                status_code = response.getcode()
                
            print(f"   ✅ HTTPS odziv: {status_code}")
            
            self.test_results["tests"]["https_response"] = {
                "success": True,
                "domain": domain,
                "port": port,
                "status_code": status_code
            }
            return True
            
        except Exception as e:
            print(f"   ❌ HTTPS odziv neuspešen: {e}")
            self.test_results["tests"]["https_response"] = {
                "success": False,
                "domain": domain,
                "port": port,
                "error": str(e)
            }
            return False
    
    def run_all_tests(self, domain="localhost"):
        """Izvršuje vse teste"""
        print("🧪 THREO SSL TESTNA SKRIPTA")
        print("=" * 40)
        
        tests = [
            ("Python odvisnosti", self.test_python_dependencies),
            ("Admin pravice", self.test_admin_privileges),
            ("Mrežna povezljivost", self.test_network_connectivity),
            ("Dostopnost portov", self.test_port_availability),
            ("SSL orodja", self.test_ssl_tools_availability),
            ("DNS resolucija", lambda: self.test_dns_resolution(domain)),
            ("SSL certifikat", lambda: self.test_ssl_certificate(domain)),
            ("HTTPS odziv", lambda: self.test_https_response(domain))
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 {test_name}")
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"   ❌ Napaka pri testu: {e}")
        
        # Izračunaj uspešnost
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"\n📊 REZULTATI TESTIRANJA")
        print("=" * 40)
        print(f"Uspešni testi: {passed_tests}/{total_tests}")
        print(f"Uspešnost: {success_rate:.1f}%")
        
        self.test_results["summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "success_rate": success_rate
        }
        
        # Shrani rezultate
        with open("threo-ssl-test-results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n💾 Rezultati shranjeni v threo-ssl-test-results.json")
        
        return success_rate >= 70  # 70% uspešnost za pozitivno oceno

def main():
    """Glavna funkcija"""
    tester = ThreoSSLTester()
    
    # Preberi domeno za testiranje
    domain = input("Vnesite domeno za testiranje (ali pritisnite Enter za localhost): ").strip()
    if not domain:
        domain = "localhost"
    
    # Izvršuj teste
    success = tester.run_all_tests(domain)
    
    if success:
        print("\n🎉 TESTIRANJE USPEŠNO!")
        print("   SSL sistem je pripravljen za uporabo")
    else:
        print("\n⚠️ TESTIRANJE DELNO USPEŠNO")
        print("   Nekateri testi niso uspeli - preverite rezultate")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())