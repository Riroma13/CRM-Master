import { TeamService } from '../team.service';

describe('TeamService.deleteTeam transaction boundary', () => {
  it('executes reassignment, child updates, and deactivation in one transaction', async () => {
    const team = { id: 'team-1', parentTeamId: null };
    const tx = {
      team: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(team)
          .mockResolvedValueOnce({ id: 'everyone-1' }),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({ ...team, active: false }),
      },
      membership: { updateMany: jest.fn() },
    };
    const prisma = {
      admin: {
        $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      },
    } as any;
    const service = new TeamService(prisma);

    await service.deleteTeam('tenant-1', 'team-1');

    expect(prisma.admin.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.membership.updateMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1', tenantId: 'tenant-1' },
      data: { teamId: 'everyone-1' },
    });
    expect(tx.team.updateMany).toHaveBeenCalledWith({
      where: { parentTeamId: 'team-1', tenantId: 'tenant-1' },
      data: { parentTeamId: 'everyone-1' },
    });
    expect(tx.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { active: false },
    });
  });
});
