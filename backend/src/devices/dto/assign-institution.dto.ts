import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignInstitutionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  institutionId!: string;
}
