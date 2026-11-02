import { DataSource } from 'typeorm';
import { ApplicationListRequest } from '../application.dto';
import { ApplicationRepository } from './application.repository';

describe('ApplicationRepository', () => {
  it('uses entity property paths when ordering the paginated application query', async () => {
    const result = [[], 0] as [never[], number];
    const queryBuilder = {
      innerJoin: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      getManyAndCount: jest.fn().mockResolvedValue(result),
    };
    for (const method of [
      queryBuilder.innerJoin,
      queryBuilder.where,
      queryBuilder.andWhere,
      queryBuilder.orderBy,
      queryBuilder.skip,
      queryBuilder.take,
    ]) {
      method.mockReturnValue(queryBuilder);
    }

    const dataSource = {
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        }),
      },
    } as unknown as DataSource;
    const repository = new ApplicationRepository(dataSource);
    const request = {
      page: 1,
      pageSize: 20,
      archived: false,
      status: undefined,
      q: '',
    } as ApplicationListRequest;

    await expect(repository.findAllByUserId('user-id', request)).resolves.toBe(
      result,
    );

    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'application.updatedAt',
      'DESC',
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
  });
});
