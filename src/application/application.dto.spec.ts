import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplicationListRequest } from './application.dto';

describe('ApplicationListRequest', () => {
  it('converts the frontend pagination query and archived flag', async () => {
    const request = plainToInstance(ApplicationListRequest, {
      page: '2',
      page_size: '150',
      archived: 'false',
    });

    expect(request.page).toBe(2);
    expect(request.page_size).toBe(150);
    expect(request.archived).toBe(false);
    await expect(validate(request)).resolves.toHaveLength(0);
  });

  it('treats an empty status query as no status filter', async () => {
    const request = plainToInstance(ApplicationListRequest, {
      status: '',
    });

    expect(request.status).toBeUndefined();
    await expect(validate(request)).resolves.toHaveLength(0);
  });
});
