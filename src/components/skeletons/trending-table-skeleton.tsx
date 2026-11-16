import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function TrendingTableSkeleton() {
  return (
    <Card className="bg-transparent border-none rounded-none p-0">
      <Table>
        <TableHeader>
          <TableRow className="border-none hover:bg-transparent h-auto">
            <TableHead className="text-[#B392F0] text-sm font-normal font-mono h-auto py-2 px-4 w-[60px]">#</TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal font-mono h-auto py-2 px-4">Name</TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px]">
              Mint Price
            </TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px]">
              Holders
            </TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px]">
              Minted
            </TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px]">
              Volume
            </TableHead>
            <TableHead className="text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-4 w-[110px]">Chart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow
              key={index}
              className="border-0"
            >
              <TableCell className="text-[#99A1AF] text-sm py-[20px] px-4 font-mono w-[60px]">
                <Skeleton className="h-4 w-4 bg-[#2D253E]" />
              </TableCell>
              <TableCell className="py-[7.5px] px-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-16 h-16 rounded-[5px] bg-[#2D253E]" />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Skeleton className="h-4 w-32 bg-[#2D253E]" />
                    <Skeleton className="h-3 w-20 bg-[#2D253E]" />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                <Skeleton className="h-4 w-16 ml-auto bg-[#2D253E]" />
                <Skeleton className="h-3 w-12 ml-auto mt-1 bg-[#2D253E]" />
              </TableCell>
              <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                <Skeleton className="h-4 w-12 ml-auto bg-[#2D253E]" />
              </TableCell>
              <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                <Skeleton className="h-4 w-20 ml-auto bg-[#2D253E]" />
                <Skeleton className="h-3 w-10 ml-auto mt-1 bg-[#2D253E]" />
              </TableCell>
              <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                <Skeleton className="h-4 w-16 ml-auto bg-[#2D253E]" />
                <Skeleton className="h-3 w-12 ml-auto mt-1 bg-[#2D253E]" />
              </TableCell>
              <TableCell className="text-right py-[18px] px-4 w-[110px]">
                <div className="flex items-center justify-end">
                  <Skeleton className="h-5 w-[67px] bg-[#2D253E]" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
