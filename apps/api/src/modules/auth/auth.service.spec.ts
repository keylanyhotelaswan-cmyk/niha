jest.mock('./users/users.service', () => ({ UsersService: jest.fn() }));
jest.mock('./roles/roles.service', () => ({ RolesService: jest.fn() }));
jest.mock('./permissions/permissions.service', () => ({ PermissionsService: jest.fn() }));


import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new AuthService(
      prismaMock as any,
      {} as any,
      {} as any,
      {} as any,
      { sign: jest.fn(() => 'token') } as any,
    );
    jest.clearAllMocks();
  });

  it('returns null when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const result = await service.validateUser('manager', 'password');
    expect(result).toBeNull();
  });

  it('returns null when password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '1',
      username: 'manager',
      passwordHash: '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQyPsJsVM22HP2Ikeq5hK0WKQj/wKm',
      status: 'ACTIVE',
      userRoles: [],
    });

    const result = await service.validateUser('manager', 'wrong-password');
    expect(result).toBeNull();
  });
});
