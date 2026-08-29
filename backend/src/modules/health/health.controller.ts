import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  HttpHealthIndicator, 
  TypeOrmHealthIndicator, // Swap with PrismaHealthIndicator / MongooseHealthIndicator if needed
  MemoryHealthIndicator 
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. Check an external API or your own homepage
      () => this.http.pingCheck('nestjs-docs', 'https://nestjs.com'),
      
      // 2. Check Database connection (requires TypeORM setup in your app)
      () => this.db.pingCheck('database', { timeout: 1500 }),
      
      // 3. Check Memory Heap (fails if it exceeds 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
