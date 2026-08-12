import { UnderMaintenance } from '@/components/ui/UnderMaintenance';

export function RouteOptimizationPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          Route Optimization
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          AI-powered PUV route planning and traffic flow analysis
        </p>
      </div>
      <UnderMaintenance
        title="Route Optimization — Under Maintenance"
        description="The AI-powered route optimization engine is currently being upgraded with enhanced traffic flow algorithms and real-time GPS integration. This feature will be available in the next release."
      />
    </div>
  );
}
