import { getMetadataArgsStorage } from 'typeorm';
import { StageItem } from './stage-item.entity';

describe('StageItem', () => {
  it('allows the service to insert the required createdAt timestamp', () => {
    const createdAtColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === StageItem && column.propertyName === 'createdAt',
    );

    expect(createdAtColumn?.options).toMatchObject({
      name: 'created_at',
      nullable: false,
      update: false,
    });
    expect(createdAtColumn?.options.insert).not.toBe(false);
  });
});
