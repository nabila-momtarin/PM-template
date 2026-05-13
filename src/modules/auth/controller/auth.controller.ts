import { Body, Controller, Get, Logger, Post } from "@nestjs/common";
import { LoginDto } from "../dto/login.dto";
import { AuthService } from "../service/auth.service";
import { Public } from "src/infrastructure/auth/decorators/public.decorator";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthenticatedUser } from "src/infrastructure/auth/types/auth.types";




@Controller('login')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    private logger = new Logger(AuthController.name);

    @Public()
    @Post()
    login(@Body() dto: LoginDto) {
        this.logger.log('CONTROLLER : login\n');

        return this.authService.login(dto);
    }

    @Get('me-test')
    meTest(@CurrentUser() user: AuthenticatedUser) {
        return {
            success: true,
            message: 'Current user fetched successfully',
            data: user,
        };
    }
}