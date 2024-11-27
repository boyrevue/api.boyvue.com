import { Injectable, HttpException } from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityNotFoundException, QueueEventService, QueueEvent } from 'src/kernel';
import { InjectModel } from '@nestjs/mongoose';
import { SettingCreatePayload, SettingUpdatePayload } from '../payloads';
import { SettingDto } from '../dtos';
import { SETTING_CHANNEL } from '../constants';
import { MenuService } from './menu.service';
import { Setting } from '../schemas';

@Injectable()
export class SettingService {
  static _settingCache = {} as Map<string, any>;

  // key and value
  static _publicSettingsCache: Record<string, any> = {};

  constructor(
    @InjectModel(Setting.name) private readonly SettingModel: Model<Setting>,
    private readonly queueEventService: QueueEventService,
    private readonly menuService: MenuService
  ) {
    this.queueEventService.subscribe(SETTING_CHANNEL, 'HANDLE_SETTINGS_CHANGE', this.subscribeChange.bind(this));
  }

  private async publishChange(setting: SettingDto) {
    await this.queueEventService.publish(new QueueEvent({
      channel: SETTING_CHANNEL,
      eventName: 'update',
      data: new SettingDto(setting)
    }));
  }

  private async subscribeChange() {
    // TODO - update directly to static variable?
    await this.syncCache();
  }

  public async syncCache(): Promise<void> {
    const settings = await this.SettingModel.find();
    settings.forEach((setting) => {
      const dto = SettingDto.fromModel(setting);
      SettingService._settingCache[dto.key] = dto;
      if (dto.visible && dto.public) {
        SettingService._publicSettingsCache[dto.key] = dto.value;
      }
    });
  }

  async get(key: string): Promise<SettingDto> {
    if (SettingService._settingCache[key]) {
      return SettingService._settingCache[key];
    }

    // TODO - handle events when settings change and reupdate here
    const data = await this.SettingModel.findOne({ key });
    if (!data) {
      return null;
    }
    const dto = SettingDto.fromModel(data);
    SettingService._settingCache[key] = dto;
    return dto;
  }

  async getKeyValue(key: string): Promise<any> {
    if (SettingService._settingCache[key]) {
      return SettingService._settingCache[key].value;
    }

    // TODO - handle events when settings change and reupdate here
    const data = await this.SettingModel.findOne({ key });
    if (!data) {
      return null;
    }
    const dto = SettingDto.fromModel(data);
    SettingService._settingCache[key] = dto;
    return dto.value;
  }

  async create(data: SettingCreatePayload): Promise<SettingDto> {
    const setting = await this.get(data.key);
    if (setting) {
      throw new HttpException('Setting key exist', 400);
    }

    // reupdate the setting list
    // TODO - must publish and subscribe to redis channel, so all instances (if run multiple)
    // have the same data
    await this.syncCache();
    const item = await this.SettingModel.create(data);
    return SettingDto.fromModel(item);
  }

  async update(key: string, data: SettingUpdatePayload): Promise<SettingDto> {
    const setting = await this.SettingModel.findOne({ key });
    if (!setting) {
      throw new EntityNotFoundException();
    }
    data.description && setting.set('description', data.description);
    data.name && setting.set('name', data.name);
    setting.set('value', data.value);
    await setting.save();
    const dto = SettingDto.fromModel(setting);
    await this.publishChange(dto);
    return dto;
  }

  // get public and visible settings
  async getPublicSettings(): Promise<Record<string, any>> {
    const menus = await this.getPublicMenus();
    SettingService._publicSettingsCache.menus = menus && menus.length ? menus : [];
    return SettingService._publicSettingsCache;
  }

  async getAutoloadPublicSettingsForUser(): Promise<Record<string, any>> {
    const menus = await this.getPublicMenus();
    const autoloadSettings: Record<string, any> = {
      menus
    };
    return Object.keys(SettingService._settingCache).reduce((settings, key) => {
      const results = settings;
      if (SettingService._settingCache[key].autoload && SettingService._publicSettingsCache[key]) {
        results[key] = SettingService._settingCache[key].value;
      }
      return results;
    }, autoloadSettings);
  }

  getPublicValueByKey(key: string) {
    return {
      value: SettingService._publicSettingsCache[key]?.value || null
    };
  }

  getPublicValueByKeys(keys: string[]) {
    return keys.reduce((lp, key) => {
      const results = lp;
      results[key] = SettingService._publicSettingsCache[key];
      return results;
    }, {} as Record<string, any>);
  }

  async getCommissionSettings() {
    return this.SettingModel.find({ group: 'commission' });
  }

  async getPublicMenus() {
    const items = await this.menuService.getPublicMenus();
    return items.map((item) => ({
      title: item.title,
      path: item.path,
      internal: item.internal,
      help: item.help,
      section: item.section,
      ordering: item.ordering,
      isNewTab: item.isNewTab
    }));
  }

  /**
   * get all settings which are editable
   */
  async getEditableSettings(group?: string): Promise<SettingDto[]> {
    const query: Record<string, any> = { editable: true };
    if (group) {
      query.group = group;
    }
    // custom sort odering
    const settings = await this.SettingModel.find(query).sort({ ordering: 'asc' });
    return settings.map((s) => SettingDto.fromModel(s));
  }

  public static getByKey(key: string) {
    return SettingService._settingCache[key] || null;
  }

  public static getValueByKey(key: string) {
    return SettingService._settingCache[key] ? SettingService._settingCache[key].value : null;
  }
}
