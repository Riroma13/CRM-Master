import { ConnectorRegistry } from '../connector-registry';
import type { Connector } from '@shared/integration';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  const mockConnector: Connector = {
    id: 'test', name: 'Test', authType: 'api-key',
    execute: jest.fn(), getAuthStatus: jest.fn(), refreshAuth: jest.fn(),
  };

  beforeEach(() => { registry = new ConnectorRegistry(); });

  it('should register and retrieve a connector', () => {
    registry.register(mockConnector);
    expect(registry.get('test')).toBe(mockConnector);
  });

  it('should return undefined for unknown connector', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('should list all connectors', () => {
    registry.register(mockConnector);
    expect(registry.getAll()).toHaveLength(1);
  });
});
