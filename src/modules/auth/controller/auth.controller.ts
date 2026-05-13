import { Body, Controller, Logger, Post } from "@nestjs/common";
import { LoginDto } from "../dto/login.dto";
import { AuthService } from "../service/auth.service";
import { Public } from "src/infrastructure/auth/decorators/public.decorator";




@Controller('login')
export class AuthController {
    constructor( private readonly authService: AuthService) {}

    private logger = new Logger(AuthController.name);

    @Public()
    @Post()
    login(@Body() dto: LoginDto) {
        this.logger.log('CONTROLLER : login\n');

        return this.authService.login(dto);
    }
}