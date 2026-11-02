import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ItemCategoryGroup } from './productivity.dto';
import { ItemCategoryRepository } from './repositories/item-category.repository';

const CATEGORIES: readonly [
  string,
  string,
  string,
  ItemCategoryGroup,
  string,
  number,
][] = [
  [
    '10000000-0000-0000-0000-000000000001',
    'HR_INTERVIEW',
    'HR Interview',
    ItemCategoryGroup.INTERVIEW,
    'users',
    10,
  ],
  [
    '10000000-0000-0000-0000-000000000002',
    'TECHNICAL_INTERVIEW',
    'Technical Interview',
    ItemCategoryGroup.INTERVIEW,
    'code-2',
    20,
  ],
  [
    '10000000-0000-0000-0000-000000000003',
    'USER_INTERVIEW',
    'User Interview',
    ItemCategoryGroup.INTERVIEW,
    'user-round',
    30,
  ],
  [
    '10000000-0000-0000-0000-000000000004',
    'MANAGER_INTERVIEW',
    'Manager Interview',
    ItemCategoryGroup.INTERVIEW,
    'briefcase-business',
    40,
  ],
  [
    '10000000-0000-0000-0000-000000000005',
    'FINAL_INTERVIEW',
    'Final Interview',
    ItemCategoryGroup.INTERVIEW,
    'badge-check',
    50,
  ],
  [
    '20000000-0000-0000-0000-000000000001',
    'CV_UPDATE',
    'Update CV',
    ItemCategoryGroup.TASK,
    'file-pen-line',
    10,
  ],
  [
    '20000000-0000-0000-0000-000000000002',
    'COVER_LETTER',
    'Cover Letter',
    ItemCategoryGroup.TASK,
    'file-text',
    20,
  ],
  [
    '20000000-0000-0000-0000-000000000003',
    'ASSESSMENT',
    'Assessment',
    ItemCategoryGroup.TASK,
    'clipboard-check',
    30,
  ],
  [
    '20000000-0000-0000-0000-000000000004',
    'PORTFOLIO',
    'Portfolio',
    ItemCategoryGroup.TASK,
    'folder-kanban',
    40,
  ],
  [
    '20000000-0000-0000-0000-000000000005',
    'FOLLOW_UP',
    'Follow-up',
    ItemCategoryGroup.TASK,
    'send',
    50,
  ],
  [
    '30000000-0000-0000-0000-000000000001',
    'STUDY_TOPIC',
    'Study Topic',
    ItemCategoryGroup.PREPARATION,
    'book-open',
    10,
  ],
  [
    '30000000-0000-0000-0000-000000000002',
    'INTERVIEW_QUESTION',
    'Interview Question',
    ItemCategoryGroup.PREPARATION,
    'message-circle-question',
    20,
  ],
  [
    '30000000-0000-0000-0000-000000000003',
    'COMPANY_RESEARCH',
    'Company Research',
    ItemCategoryGroup.PREPARATION,
    'building-2',
    30,
  ],
  [
    '30000000-0000-0000-0000-000000000004',
    'TECHNICAL_PRACTICE',
    'Technical Practice',
    ItemCategoryGroup.PREPARATION,
    'braces',
    40,
  ],
  [
    '30000000-0000-0000-0000-000000000005',
    'QUESTION_FOR_INTERVIEWER',
    'Question for Interviewer',
    ItemCategoryGroup.PREPARATION,
    'circle-help',
    50,
  ],
  [
    '30000000-0000-0000-0000-000000000006',
    'REFLECTION',
    'Reflection',
    ItemCategoryGroup.PREPARATION,
    'notebook-pen',
    60,
  ],
] as const;

@Injectable()
export class ItemCategorySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ItemCategorySeeder.name);

  constructor(private readonly categories: ItemCategoryRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.categories.upsertCategories(
      CATEGORIES.map(([id, code, label, group, icon, sortOrder]) => ({
        id,
        code,
        label,
        group,
        icon,
        isActive: true,
        sortOrder,
      })),
    );
    this.logger.log(`Ensured ${CATEGORIES.length} stage item categories.`);
  }
}
