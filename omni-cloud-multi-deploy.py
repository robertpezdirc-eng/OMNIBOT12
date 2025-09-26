#!/usr/bin/env python3
"""
🌐 OMNI MULTI-CLOUD DEPLOYMENT SCRIPT
Avtomatska namestitev Omni-Brain platforme na različne oblačne ponudnike
Podpira: AWS EC2, Google Cloud VM, Azure VM, DigitalOcean Droplet
"""

import json
import os
import sys
import subprocess
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional

class OmniCloudDeployer:
    def __init__(self):
        self.config = {}
        self.log_file = f"omni-deploy-{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        self.supported_providers = ['aws', 'gcp', 'azure', 'digitalocean']
        
    def log(self, message: str, level: str = "INFO"):
        """Logging funkcija"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + '\n')
    
    def error(self, message: str):
        """Error logging in exit"""
        self.log(message, "ERROR")
        sys.exit(1)
    
    def run_command(self, command: str, check: bool = True) -> subprocess.CompletedProcess:
        """Izvršitev sistemskega ukaza"""
        self.log(f"Izvršujem: {command}")
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=check
            )
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            return result
        except subprocess.CalledProcessError as e:
            self.error(f"Napaka pri ukazu '{command}': {e}")
    
    def load_config(self, config_file: str = "omni-cloud-config.json"):
        """Naloži konfiguracijo"""
        if os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            self.log(f"Konfiguracija naložena iz {config_file}")
        else:
            self.create_default_config(config_file)
    
    def create_default_config(self, config_file: str):
        """Ustvari privzeto konfiguracijo"""
        default_config = {
            "general": {
                "domain": "",
                "email": "",
                "omni_version": "1.0.0",
                "github_repo": "https://github.com/your-repo/omniscient-ai-platform.git",
                "install_dir": "/opt/omni-brain",
                "service_user": "omni"
            },
            "providers": {
                "aws": {
                    "region": "eu-west-1",
                    "instance_type": "t3.medium",
                    "ami_id": "ami-0c02fb55956c7d316",  # Ubuntu 22.04 LTS
                    "key_name": "",
                    "security_group": "omni-sg",
                    "subnet_id": ""
                },
                "gcp": {
                    "project_id": "",
                    "zone": "europe-west1-b",
                    "machine_type": "e2-medium",
                    "image_family": "ubuntu-2204-lts",
                    "image_project": "ubuntu-os-cloud",
                    "network": "default"
                },
                "azure": {
                    "resource_group": "omni-rg",
                    "location": "West Europe",
                    "vm_size": "Standard_B2s",
                    "image": "Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest",
                    "admin_username": "omni"
                },
                "digitalocean": {
                    "region": "fra1",
                    "size": "s-2vcpu-4gb",
                    "image": "ubuntu-22-04-x64",
                    "ssh_keys": []
                }
            },
            "ssl": {
                "use_threo": True,
                "auto_renew": True,
                "backup_certs": True
            },
            "monitoring": {
                "enable_health_checks": True,
                "enable_logging": True,
                "enable_backups": True,
                "backup_retention_days": 7
            }
        }
        
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        
        self.log(f"Ustvarjena privzeta konfiguracija: {config_file}")
        self.log("Prosim, uredite konfiguracijo in ponovno zaženite skripto")
        sys.exit(0)
    
    def check_prerequisites(self, provider: str):
        """Preveri predpogoje za izbrani provider"""
        self.log(f"Preverjam predpogoje za {provider}...")
        
        if provider == "aws":
            self.check_aws_cli()
        elif provider == "gcp":
            self.check_gcp_cli()
        elif provider == "azure":
            self.check_azure_cli()
        elif provider == "digitalocean":
            self.check_do_cli()
    
    def check_aws_cli(self):
        """Preveri AWS CLI"""
        try:
            result = self.run_command("aws --version", check=False)
            if result.returncode != 0:
                self.error("AWS CLI ni nameščen. Namestite z: pip install awscli")
            
            # Preveri credentials
            result = self.run_command("aws sts get-caller-identity", check=False)
            if result.returncode != 0:
                self.error("AWS credentials niso konfigurirani. Zaženite: aws configure")
            
            self.log("✅ AWS CLI je pripravljen")
        except Exception as e:
            self.error(f"Napaka pri preverjanju AWS CLI: {e}")
    
    def check_gcp_cli(self):
        """Preveri Google Cloud CLI"""
        try:
            result = self.run_command("gcloud --version", check=False)
            if result.returncode != 0:
                self.error("Google Cloud CLI ni nameščen")
            
            # Preveri authentication
            result = self.run_command("gcloud auth list --filter=status:ACTIVE", check=False)
            if "ACTIVE" not in result.stdout:
                self.error("Google Cloud ni avtenticiran. Zaženite: gcloud auth login")
            
            self.log("✅ Google Cloud CLI je pripravljen")
        except Exception as e:
            self.error(f"Napaka pri preverjanju Google Cloud CLI: {e}")
    
    def check_azure_cli(self):
        """Preveri Azure CLI"""
        try:
            result = self.run_command("az --version", check=False)
            if result.returncode != 0:
                self.error("Azure CLI ni nameščen")
            
            # Preveri login
            result = self.run_command("az account show", check=False)
            if result.returncode != 0:
                self.error("Azure ni avtenticiran. Zaženite: az login")
            
            self.log("✅ Azure CLI je pripravljen")
        except Exception as e:
            self.error(f"Napaka pri preverjanju Azure CLI: {e}")
    
    def check_do_cli(self):
        """Preveri DigitalOcean CLI"""
        try:
            result = self.run_command("doctl version", check=False)
            if result.returncode != 0:
                self.error("DigitalOcean CLI ni nameščen")
            
            # Preveri authentication
            result = self.run_command("doctl account get", check=False)
            if result.returncode != 0:
                self.error("DigitalOcean ni avtenticiran. Zaženite: doctl auth init")
            
            self.log("✅ DigitalOcean CLI je pripravljen")
        except Exception as e:
            self.error(f"Napaka pri preverjanju DigitalOcean CLI: {e}")
    
    def create_aws_instance(self) -> str:
        """Ustvari AWS EC2 instanco"""
        self.log("Ustvarjam AWS EC2 instanco...")
        
        aws_config = self.config['providers']['aws']
        
        # Ustvari security group
        sg_command = f"""
        aws ec2 create-security-group \\
            --group-name {aws_config['security_group']} \\
            --description "Omni-Brain Security Group" \\
            --region {aws_config['region']}
        """
        self.run_command(sg_command, check=False)
        
        # Dodaj pravila
        rules = [
            "aws ec2 authorize-security-group-ingress --group-name {sg} --protocol tcp --port 22 --cidr 0.0.0.0/0 --region {region}",
            "aws ec2 authorize-security-group-ingress --group-name {sg} --protocol tcp --port 80 --cidr 0.0.0.0/0 --region {region}",
            "aws ec2 authorize-security-group-ingress --group-name {sg} --protocol tcp --port 443 --cidr 0.0.0.0/0 --region {region}"
        ]
        
        for rule in rules:
            self.run_command(rule.format(
                sg=aws_config['security_group'],
                region=aws_config['region']
            ), check=False)
        
        # Ustvari instanco
        instance_command = f"""
        aws ec2 run-instances \\
            --image-id {aws_config['ami_id']} \\
            --count 1 \\
            --instance-type {aws_config['instance_type']} \\
            --key-name {aws_config['key_name']} \\
            --security-groups {aws_config['security_group']} \\
            --region {aws_config['region']} \\
            --tag-specifications 'ResourceType=instance,Tags=[{{Key=Name,Value=omni-brain}}]'
        """
        
        result = self.run_command(instance_command)
        instance_data = json.loads(result.stdout)
        instance_id = instance_data['Instances'][0]['InstanceId']
        
        self.log(f"✅ AWS instanca ustvarjena: {instance_id}")
        
        # Počakaj, da se instanca zažene
        self.log("Čakam, da se instanca zažene...")
        wait_command = f"aws ec2 wait instance-running --instance-ids {instance_id} --region {aws_config['region']}"
        self.run_command(wait_command)
        
        # Pridobi javni IP
        ip_command = f"""
        aws ec2 describe-instances \\
            --instance-ids {instance_id} \\
            --region {aws_config['region']} \\
            --query 'Reservations[0].Instances[0].PublicIpAddress' \\
            --output text
        """
        
        result = self.run_command(ip_command)
        public_ip = result.stdout.strip()
        
        self.log(f"✅ Javni IP: {public_ip}")
        return public_ip
    
    def create_gcp_instance(self) -> str:
        """Ustvari Google Cloud VM instanco"""
        self.log("Ustvarjam Google Cloud VM instanco...")
        
        gcp_config = self.config['providers']['gcp']
        
        # Nastavi projekt
        self.run_command(f"gcloud config set project {gcp_config['project_id']}")
        
        # Ustvari firewall pravila
        firewall_rules = [
            "gcloud compute firewall-rules create omni-http --allow tcp:80 --source-ranges 0.0.0.0/0 --description 'Allow HTTP'",
            "gcloud compute firewall-rules create omni-https --allow tcp:443 --source-ranges 0.0.0.0/0 --description 'Allow HTTPS'"
        ]
        
        for rule in firewall_rules:
            self.run_command(rule, check=False)
        
        # Ustvari instanco
        instance_command = f"""
        gcloud compute instances create omni-brain \\
            --zone={gcp_config['zone']} \\
            --machine-type={gcp_config['machine_type']} \\
            --image-family={gcp_config['image_family']} \\
            --image-project={gcp_config['image_project']} \\
            --boot-disk-size=20GB \\
            --boot-disk-type=pd-standard \\
            --tags=http-server,https-server
        """
        
        self.run_command(instance_command)
        
        # Pridobi javni IP
        ip_command = f"""
        gcloud compute instances describe omni-brain \\
            --zone={gcp_config['zone']} \\
            --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
        """
        
        result = self.run_command(ip_command)
        public_ip = result.stdout.strip()
        
        self.log(f"✅ Google Cloud instanca ustvarjena: {public_ip}")
        return public_ip
    
    def create_azure_instance(self) -> str:
        """Ustvari Azure VM instanco"""
        self.log("Ustvarjam Azure VM instanco...")
        
        azure_config = self.config['providers']['azure']
        
        # Ustvari resource group
        rg_command = f"""
        az group create \\
            --name {azure_config['resource_group']} \\
            --location "{azure_config['location']}"
        """
        self.run_command(rg_command, check=False)
        
        # Ustvari VM
        vm_command = f"""
        az vm create \\
            --resource-group {azure_config['resource_group']} \\
            --name omni-brain \\
            --image {azure_config['image']} \\
            --size {azure_config['vm_size']} \\
            --admin-username {azure_config['admin_username']} \\
            --generate-ssh-keys \\
            --public-ip-sku Standard
        """
        
        result = self.run_command(vm_command)
        vm_data = json.loads(result.stdout)
        public_ip = vm_data['publicIpAddress']
        
        # Odpri porte
        port_command = f"""
        az vm open-port \\
            --resource-group {azure_config['resource_group']} \\
            --name omni-brain \\
            --port 80,443 \\
            --priority 1000
        """
        self.run_command(port_command)
        
        self.log(f"✅ Azure VM ustvarjen: {public_ip}")
        return public_ip
    
    def create_digitalocean_droplet(self) -> str:
        """Ustvari DigitalOcean droplet"""
        self.log("Ustvarjam DigitalOcean droplet...")
        
        do_config = self.config['providers']['digitalocean']
        
        # Ustvari droplet
        droplet_command = f"""
        doctl compute droplet create omni-brain \\
            --region {do_config['region']} \\
            --size {do_config['size']} \\
            --image {do_config['image']} \\
            --wait \\
            --format ID,Name,PublicIPv4
        """
        
        result = self.run_command(droplet_command)
        
        # Pridobi IP iz output
        lines = result.stdout.strip().split('\n')
        if len(lines) > 1:
            public_ip = lines[1].split()[-1]
        else:
            self.error("Ni mogoče pridobiti IP naslova droplet-a")
        
        self.log(f"✅ DigitalOcean droplet ustvarjen: {public_ip}")
        return public_ip
    
    def deploy_omni(self, public_ip: str):
        """Namesti Omni na strežnik"""
        self.log(f"Nameščam Omni na strežnik {public_ip}...")
        
        # Počakaj, da je SSH dostopen
        self.wait_for_ssh(public_ip)
        
        # Kopiraj deployment skripto
        scp_command = f"scp -o StrictHostKeyChecking=no omni-cloud-deploy.sh ubuntu@{public_ip}:/tmp/"
        self.run_command(scp_command)
        
        # Zaženi deployment
        ssh_command = f"""
        ssh -o StrictHostKeyChecking=no ubuntu@{public_ip} \\
            'chmod +x /tmp/omni-cloud-deploy.sh && \\
             echo "{self.config["general"]["domain"]}" | \\
             echo "{self.config["general"]["email"]}" | \\
             sudo /tmp/omni-cloud-deploy.sh'
        """
        
        self.run_command(ssh_command)
        
        self.log("✅ Omni uspešno nameščen")
    
    def wait_for_ssh(self, public_ip: str, timeout: int = 300):
        """Počakaj, da je SSH dostopen"""
        self.log(f"Čakam, da je SSH dostopen na {public_ip}...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                result = self.run_command(
                    f"ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@{public_ip} 'echo SSH_OK'",
                    check=False
                )
                if result.returncode == 0:
                    self.log("✅ SSH je dostopen")
                    return
            except:
                pass
            
            time.sleep(10)
        
        self.error(f"SSH ni postal dostopen v {timeout} sekundah")
    
    def verify_deployment(self, public_ip: str):
        """Preveri uspešnost namestitve"""
        self.log(f"Preverjam namestitev na https://{self.config['general']['domain']}...")
        
        try:
            # Počakaj malo, da se strežnik zažene
            time.sleep(30)
            
            response = requests.get(f"https://{self.config['general']['domain']}", timeout=30)
            if response.status_code == 200:
                self.log("✅ Omni je uspešno dostopen preko HTTPS")
                return True
            else:
                self.log(f"⚠️ HTTP status: {response.status_code}")
                return False
        except Exception as e:
            self.log(f"⚠️ Napaka pri preverjanju: {e}")
            return False
    
    def generate_report(self, provider: str, public_ip: str, success: bool):
        """Generiraj poročilo o namestitvi"""
        report = {
            "deployment_info": {
                "provider": provider,
                "public_ip": public_ip,
                "domain": self.config['general']['domain'],
                "timestamp": datetime.now().isoformat(),
                "success": success
            },
            "configuration": self.config,
            "log_file": self.log_file
        }
        
        report_file = f"omni-deployment-report-{provider}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"📊 Poročilo shranjeno: {report_file}")
        return report_file
    
    def deploy(self, provider: str):
        """Glavna deployment funkcija"""
        if provider not in self.supported_providers:
            self.error(f"Nepodprt provider: {provider}. Podprti: {', '.join(self.supported_providers)}")
        
        self.log(f"🚀 Začenjam deployment na {provider.upper()}...")
        
        # Preveri predpogoje
        self.check_prerequisites(provider)
        
        # Ustvari instanco
        if provider == "aws":
            public_ip = self.create_aws_instance()
        elif provider == "gcp":
            public_ip = self.create_gcp_instance()
        elif provider == "azure":
            public_ip = self.create_azure_instance()
        elif provider == "digitalocean":
            public_ip = self.create_digitalocean_droplet()
        
        # Namesti Omni
        self.deploy_omni(public_ip)
        
        # Preveri namestitev
        success = self.verify_deployment(public_ip)
        
        # Generiraj poročilo
        report_file = self.generate_report(provider, public_ip, success)
        
        if success:
            self.log("🎉 DEPLOYMENT USPEŠNO KONČAN!")
            self.log(f"🌐 Omni je dostopen na: https://{self.config['general']['domain']}")
        else:
            self.log("⚠️ Deployment končan, vendar preverjanje ni uspešno")
        
        return success

def main():
    """Glavna funkcija"""
    if len(sys.argv) < 2:
        print("Uporaba: python omni-cloud-multi-deploy.py <provider>")
        print("Podprti providerji: aws, gcp, azure, digitalocean")
        sys.exit(1)
    
    provider = sys.argv[1].lower()
    
    deployer = OmniCloudDeployer()
    deployer.load_config()
    
    try:
        success = deployer.deploy(provider)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        deployer.log("Deployment prekinjen s strani uporabnika")
        sys.exit(1)
    except Exception as e:
        deployer.error(f"Nepričakovana napaka: {e}")

if __name__ == "__main__":
    main()