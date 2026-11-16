import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Retry helper untuk query yang gagal karena koneksi terputus
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if error is connection-related
      const isConnectionError = 
        error?.code === '57P01' || // terminating connection
        error?.code === 'P2024' || // Timed out fetching
        error?.code === 'P1001' || // Can't reach database
        error?.message?.includes('Connection') ||
        error?.message?.includes('ECONNREFUSED')
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error
      }
      
      console.warn(`⚠️ Database connection error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }
  
  throw lastError
}

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [], // Matikan semua log Prisma
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma

// Prisma client dengan auto-retry untuk semua operations
const prismaWithRetry = new Proxy(basePrisma, {
  get(target, prop) {
    const original = target[prop as keyof typeof target]
    
    // Handle special Prisma methods ($connect, $disconnect, $transaction, etc.)
    if (typeof prop === 'string' && prop.startsWith('$')) {
      if (prop === '$transaction' || prop === '$queryRaw' || prop === '$queryRawUnsafe' || prop === '$executeRaw' || prop === '$executeRawUnsafe') {
        return (...args: any[]) => withRetry(() => (original as any).apply(target, args))
      }
      return original
    }
    
    // Skip non-model properties
    if (typeof original !== 'object' || original === null) {
      return original
    }
    
    // Wrap model operations dengan retry
    return new Proxy(original, {
      get(modelTarget: any, modelProp) {
        const modelOriginal = modelTarget[modelProp]
        
        // Wrap query methods dengan retry
        if (typeof modelOriginal === 'function' && 
            ['findMany', 'findUnique', 'findFirst', 'findFirstOrThrow', 'findUniqueOrThrow',
             'count', 'aggregate', 'create', 'update', 'upsert', 'delete', 
             'deleteMany', 'updateMany', 'createMany', 'groupBy'].includes(modelProp as string)) {
          return (...args: any[]) => withRetry(() => modelOriginal.apply(modelTarget, args))
        }
        
        return modelOriginal
      }
    })
  }
}) as typeof basePrisma

// Export prisma dengan auto-retry sebagai default
export const prisma = prismaWithRetry
export default prismaWithRetry

// Types for better TypeScript support
export type * from '@prisma/client'

// Helper functions for common operations
export const createTransaction = async <T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
) => {
  return await prismaWithRetry.$transaction(callback)
}

// Database connection helper
export const connectDB = async () => {
  try {
    await basePrisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

// Database disconnection helper
export const disconnectDB = async () => {
  try {
    await basePrisma.$disconnect()
    console.log('🔌 Database disconnected')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}
