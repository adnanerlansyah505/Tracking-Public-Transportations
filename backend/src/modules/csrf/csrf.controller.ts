// csrf.controller.ts

import {
  Controller,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { generateToken } from '../../common/guards/csrf';
import { Public } from '../auth/decorators/public.decorator';

@Controller('csrf')
export class CsrfController {

  @Get('token')
  @Public() getToken(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const token = generateToken(req, res);

    return {
        csrfToken: token,
    };
  }
}