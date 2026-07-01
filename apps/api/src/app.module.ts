import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './modules/tenants/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/clients/client.module';
import { SystemModule } from './modules/systems/system.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BitacoraModule } from './modules/bitacora/bitacora.module';
import { TaskModule } from './modules/tasks/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    TenantModule,
    AuthModule,
    ClientModule,
    SystemModule,
    InventoryModule,
    BitacoraModule,
    TaskModule,
  ],
})
export class AppModule {}
