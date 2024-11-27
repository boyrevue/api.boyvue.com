import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { COUNTRIES } from '../constants';

@Injectable()
export class CountryService {
  constructor(private httpService: HttpService) { }

  private countryList;

  public getList() {
    if (this.countryList) {
      return this.countryList;
    }

    this.countryList = COUNTRIES.map((c) => ({
      name: c.name,
      code: c.code,
      flag: c.flag
    }));
    return this.countryList;
  }

  public async findCountryByIP(ip: string): Promise<{
    status: string;
    countryCode: string;
  }> {
    try {
      const response = await lastValueFrom(
        this.httpService
          .get(`http://ip-api.com/json/${ip}`)
      );
      return response.data;
    } catch (e) {
      // const error = e.then(resp => resp);;
      return null;
    }
  }
}
