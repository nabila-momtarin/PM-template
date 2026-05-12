import { Body, Controller, Logger, Post } from "@nestjs/common";
import { LoginDto } from "../dto/login.dto";
import { AuthService } from "../service/auth.service";




@Controller('login')
export class AuthController {
    constructor( private readonly authService: AuthService) {}

    private logger = new Logger(AuthController.name);

    @Post()
    login(@Body() dto: LoginDto) {
        this.logger.log('CONTROLLER : login\n');

        return this.authService.login(dto);
    }
}