import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { User } from '../../auth/entities/user.entity';
import {
  PatchStageItemRequest,
  StageItemListRequest,
  StageItemRequest,
  StagePatchRequest,
  StageRequest,
} from '../productivity.dto';
import { RoadmapService } from '../services/roadmap.service';
import { StageItemService } from '../services/stage-item.service';

type AuthenticatedRequest = Request & { user: User };

@Controller('api/v1')
@UseGuards(AuthGuard)
export class RoadmapController {
  constructor(
    private readonly roadmaps: RoadmapService,
    private readonly stageItems: StageItemService,
  ) {}

  @Post('applications/:applicationId/roadmap')
  create(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query('custom', new ParseBoolPipe({ optional: true }))
    custom = false,
  ) {
    return this.roadmaps.create(request.user.id, applicationId, custom);
  }

  @Get('applications/:applicationId/roadmap')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.roadmaps.get(request.user.id, applicationId);
  }

  @Post('applications/:applicationId/roadmap/stages')
  addStage(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() body: StageRequest,
  ) {
    return this.roadmaps.addStage(request.user.id, applicationId, body);
  }

  @Patch('roadmap/stages/:stageId')
  updateStage(
    @Req() request: AuthenticatedRequest,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() body: StagePatchRequest,
  ) {
    return this.roadmaps.updateStage(request.user.id, stageId, body);
  }

  @Delete('roadmap/stages/:stageId')
  deleteStage(
    @Req() request: AuthenticatedRequest,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.roadmaps.deleteStage(request.user.id, stageId);
  }

  @Post('roadmap/stages/:stageId/complete')
  @HttpCode(HttpStatus.OK)
  completeStage(
    @Req() request: AuthenticatedRequest,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.roadmaps.complete(request.user.id, stageId);
  }

  @Get('applications/:applicationId/stage-items')
  listStageItems(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query() query: StageItemListRequest,
  ) {
    return this.stageItems.list(request.user.id, applicationId, query);
  }

  @Get('applications/:applicationId/roadmap/stages/:stageId/items')
  listStageItemsByStage(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Query() query: StageItemListRequest,
  ) {
    return this.stageItems.list(request.user.id, applicationId, query, stageId);
  }

  @Post('applications/:applicationId/stage-items')
  createStageItem(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() body: StageItemRequest,
  ) {
    return this.stageItems.create(request.user.id, applicationId, body);
  }

  @Patch('applications/:applicationId/stage-items/:itemId')
  updateStageItem(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: PatchStageItemRequest,
  ) {
    return this.stageItems.patch(request.user.id, applicationId, itemId, body);
  }

  @Delete('applications/:applicationId/stage-items/:itemId')
  deleteStageItem(
    @Req() request: AuthenticatedRequest,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.stageItems.delete(request.user.id, applicationId, itemId);
  }
}

@Controller('api/v1/roadmap/item-categories')
export class ItemCategoryController {
  constructor(private readonly stageItems: StageItemService) {}

  @Get()
  list() {
    return this.stageItems.listCategories();
  }
}
