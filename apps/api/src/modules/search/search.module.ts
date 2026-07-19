import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma.service';
import { TsVectorSearchEngine } from './engines';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchEventHandlers } from './search.event-handlers';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchEventHandlers,
    {
      provide: 'SEARCH_ENGINE',
      useClass: TsVectorSearchEngine,
    },
    PrismaService,
  ],
  exports: [SearchService, 'SEARCH_ENGINE'],
})
export class SearchModule {}
