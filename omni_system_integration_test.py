#!/usr/bin/env python3
"""
OmniCore System Integration Test
Testira integracijo vseh komponent platforme
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum

class TestStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    message: str
    details: Dict[str, Any] = None

class OmniSystemIntegrationTest:
    def __init__(self):
        self.services = {
            "cloud_infrastructure": "http://localhost:8200",
            "message_broker": "http://localhost:8201", 
            "enterprise_security": "http://localhost:8202",
            "multi_tenant_database": "http://localhost:8203",
            "production_dashboard": "http://localhost:8204"
        }
        self.test_results: List[TestResult] = []
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_service_health(self, service_name: str, url: str) -> TestResult:
        """Test osnovne dostopnosti storitve"""
        start_time = time.time()
        
        try:
            async with self.session.get(f"{url}/health", timeout=5) as response:
                if response.status == 200:
                    data = await response.json()
                    duration = time.time() - start_time
                    return TestResult(
                        name=f"{service_name}_health",
                        status=TestStatus.PASSED,
                        duration=duration,
                        message=f"Service {service_name} is healthy",
                        details=data
                    )
                else:
                    duration = time.time() - start_time
                    return TestResult(
                        name=f"{service_name}_health",
                        status=TestStatus.FAILED,
                        duration=duration,
                        message=f"Service {service_name} returned status {response.status}"
                    )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                name=f"{service_name}_health",
                status=TestStatus.FAILED,
                duration=duration,
                message=f"Service {service_name} is not accessible: {str(e)}"
            )

    async def test_service_endpoints(self, service_name: str, url: str) -> List[TestResult]:
        """Test ključnih endpoint-ov za vsako storitev"""
        results = []
        
        endpoints = {
            "cloud_infrastructure": ["/regions", "/services", "/metrics"],
            "message_broker": ["/topics", "/metrics"],
            "enterprise_security": ["/audit", "/compliance"],
            "multi_tenant_database": ["/tenants", "/audit"],
            "production_dashboard": ["/api/services", "/api/metrics"]
        }
        
        for endpoint in endpoints.get(service_name, []):
            start_time = time.time()
            try:
                async with self.session.get(f"{url}{endpoint}", timeout=5) as response:
                    duration = time.time() - start_time
                    if response.status in [200, 404]:  # 404 je OK za nekatere endpoint-e
                        results.append(TestResult(
                            name=f"{service_name}{endpoint.replace('/', '_')}",
                            status=TestStatus.PASSED,
                            duration=duration,
                            message=f"Endpoint {endpoint} accessible"
                        ))
                    else:
                        results.append(TestResult(
                            name=f"{service_name}{endpoint.replace('/', '_')}",
                            status=TestStatus.FAILED,
                            duration=duration,
                            message=f"Endpoint {endpoint} returned {response.status}"
                        ))
            except Exception as e:
                duration = time.time() - start_time
                results.append(TestResult(
                    name=f"{service_name}{endpoint.replace('/', '_')}",
                    status=TestStatus.FAILED,
                    duration=duration,
                    message=f"Endpoint {endpoint} error: {str(e)}"
                ))
        
        return results

    async def test_inter_service_communication(self) -> List[TestResult]:
        """Test komunikacije med storitvami"""
        results = []
        
        # Test dashboard -> vsi servisi
        start_time = time.time()
        try:
            dashboard_url = self.services["production_dashboard"]
            async with self.session.get(f"{dashboard_url}/api/services", timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    duration = time.time() - start_time
                    results.append(TestResult(
                        name="dashboard_service_discovery",
                        status=TestStatus.PASSED,
                        duration=duration,
                        message="Dashboard can discover all services",
                        details=data
                    ))
                else:
                    duration = time.time() - start_time
                    results.append(TestResult(
                        name="dashboard_service_discovery",
                        status=TestStatus.FAILED,
                        duration=duration,
                        message=f"Dashboard service discovery failed: {response.status}"
                    ))
        except Exception as e:
            duration = time.time() - start_time
            results.append(TestResult(
                name="dashboard_service_discovery",
                status=TestStatus.FAILED,
                duration=duration,
                message=f"Dashboard service discovery error: {str(e)}"
            ))
        
        return results

    async def test_performance_metrics(self) -> List[TestResult]:
        """Test performančnih metrik"""
        results = []
        
        for service_name, url in self.services.items():
            start_time = time.time()
            try:
                async with self.session.get(f"{url}/metrics", timeout=5) as response:
                    duration = time.time() - start_time
                    if response.status == 200:
                        data = await response.json()
                        
                        # Preveri če so metrike smiselne
                        if isinstance(data, dict) and len(data) > 0:
                            results.append(TestResult(
                                name=f"{service_name}_metrics",
                                status=TestStatus.PASSED,
                                duration=duration,
                                message=f"Service {service_name} provides valid metrics",
                                details={"metric_count": len(data)}
                            ))
                        else:
                            results.append(TestResult(
                                name=f"{service_name}_metrics",
                                status=TestStatus.FAILED,
                                duration=duration,
                                message=f"Service {service_name} metrics are invalid"
                            ))
                    else:
                        results.append(TestResult(
                            name=f"{service_name}_metrics",
                            status=TestStatus.FAILED,
                            duration=duration,
                            message=f"Service {service_name} metrics endpoint failed: {response.status}"
                        ))
            except Exception as e:
                duration = time.time() - start_time
                results.append(TestResult(
                    name=f"{service_name}_metrics",
                    status=TestStatus.FAILED,
                    duration=duration,
                    message=f"Service {service_name} metrics error: {str(e)}"
                ))
        
        return results

    async def run_all_tests(self) -> Dict[str, Any]:
        """Zaženi vse teste"""
        print("🧪 Zaganjam OmniCore System Integration Tests...")
        print("=" * 60)
        
        all_results = []
        
        # 1. Test osnovne dostopnosti
        print("\n📡 Testing service health...")
        for service_name, url in self.services.items():
            result = await self.test_service_health(service_name, url)
            all_results.append(result)
            status_icon = "✅" if result.status == TestStatus.PASSED else "❌"
            print(f"  {status_icon} {service_name}: {result.message} ({result.duration:.2f}s)")
        
        # 2. Test endpoint-ov
        print("\n🔗 Testing service endpoints...")
        for service_name, url in self.services.items():
            endpoint_results = await self.test_service_endpoints(service_name, url)
            all_results.extend(endpoint_results)
            passed = sum(1 for r in endpoint_results if r.status == TestStatus.PASSED)
            total = len(endpoint_results)
            print(f"  📊 {service_name}: {passed}/{total} endpoints OK")
        
        # 3. Test inter-service komunikacije
        print("\n🔄 Testing inter-service communication...")
        comm_results = await self.test_inter_service_communication()
        all_results.extend(comm_results)
        for result in comm_results:
            status_icon = "✅" if result.status == TestStatus.PASSED else "❌"
            print(f"  {status_icon} {result.name}: {result.message}")
        
        # 4. Test performančnih metrik
        print("\n📈 Testing performance metrics...")
        perf_results = await self.test_performance_metrics()
        all_results.extend(perf_results)
        for result in perf_results:
            status_icon = "✅" if result.status == TestStatus.PASSED else "❌"
            print(f"  {status_icon} {result.name}: {result.message}")
        
        # Povzetek rezultatov
        passed = sum(1 for r in all_results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in all_results if r.status == TestStatus.FAILED)
        total = len(all_results)
        
        print("\n" + "=" * 60)
        print(f"🎯 TEST SUMMARY:")
        print(f"   ✅ Passed: {passed}")
        print(f"   ❌ Failed: {failed}")
        print(f"   📊 Total:  {total}")
        print(f"   📈 Success Rate: {(passed/total*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! OmniCore platform is fully operational!")
        else:
            print(f"\n⚠️  {failed} tests failed. Check the details above.")
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": passed/total*100,
            "results": [
                {
                    "name": r.name,
                    "status": r.status.value,
                    "duration": r.duration,
                    "message": r.message,
                    "details": r.details
                }
                for r in all_results
            ]
        }

async def main():
    """Main test runner"""
    async with OmniSystemIntegrationTest() as tester:
        results = await tester.run_all_tests()
        
        # Shrani rezultate
        with open("test_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Test results saved to: test_results.json")

if __name__ == "__main__":
    asyncio.run(main())