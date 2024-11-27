import {
  Controller,
  Injectable,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Put,
  Param,
  Get,
  Query,
  Delete
} from '@nestjs/common';
import { RoleGuard } from 'src/modules/auth/guards';
import { DataResponse, PageableData } from 'src/kernel';
import { Roles } from 'src/modules/auth';
import { CategoryService } from '../services';
import { CategoryUpdatePayload } from '../payloads/category-update.payload';
import { CategoryCreatePayload } from '../payloads/category-create.payload';
import { CategorySearchRequest } from '../payloads/category-search.request';
import { CategoryDto } from '../dtos';

@Injectable()
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post('')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async createCategory(
    @Body() payload: CategoryCreatePayload
  ): Promise<DataResponse<CategoryDto>> {
    const resp = await this.categoryService.create(payload);
    return DataResponse.ok(resp);
  }

  @Put('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async updateCategory(
    @Param('id') id: string,
    @Body() payload: CategoryUpdatePayload
  ): Promise<DataResponse<CategoryDto>> {
    const resp = await this.categoryService.update(id, payload);
    return DataResponse.ok(resp);
  }

  @Get('/search')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async searchCategory(@Query() req: CategorySearchRequest): Promise<DataResponse<PageableData<CategoryDto>>> {
    const resp = await this.categoryService.search(req);
    return DataResponse.ok(resp);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  @UsePipes(new ValidationPipe({
    transform: true,
    whitelist: true
  }))
  async view(@Param('id') id: string): Promise<DataResponse<CategoryDto>> {
    const resp = await this.categoryService.findByIdOrAlias(id);
    return DataResponse.ok(resp);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @UseGuards(RoleGuard)
  async delete(@Param('id') id: string): Promise<DataResponse<boolean>> {
    const details = await this.categoryService.delete(id);
    return DataResponse.ok(details);
  }
}
