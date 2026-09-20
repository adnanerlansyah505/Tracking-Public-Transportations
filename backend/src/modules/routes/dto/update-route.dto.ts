import { PartialType } from '@nestjs/mapped-types';
import { CreateRouteDTO } from './create-route.dto';

/** Admin edit payload — every field is optional, provided fields are re-validated. */
export class UpdateRouteDTO extends PartialType(CreateRouteDTO) {}
