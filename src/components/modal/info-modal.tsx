'use client';

import {
    Dialog,
    DialogContent
} from '@/components/ui/dialog';
import { Separator } from '../ui/separator';
import { formatAddress } from '@/lib/utils';
import moment from 'moment';
import { CollectionData } from '@/types/collection';

interface AlertModalProps {
    collection: CollectionData;
    isOpen: boolean;
    onClose: () => void;
}

export default function InfoModal({
    collection,
    isOpen,
    onClose
}: AlertModalProps) {

    const formatCreatedDate = (date: Date | undefined | null) => {
        if(!date) return "";
        return moment.utc(date).format('MMMM D, YYYY h:mm A [UTC]');
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95%] md:!max-w-xl rounded-xl bg-[#0D0E10] border-[#2F3336]">
                <div className="w-full bg-[#0D0E10] text-white">
                    <span className='font-bold md:!text-xl'>{collection?.name}</span>
                    <div className='text-gray-400 text-xs md:text-sm mt-2 space-y-3'>
                        {collection?.description.split('\n\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                    <Separator className="my-4" />
                    <div className='flex justify-between my-2 text-[#B392F0] text-xs md:text-sm'>
                        <span>Contract Address:</span>
                        <div className='flex gap-x-1 items-center text-xs md:text-sm'>
                            <span>{formatAddress(collection?.contractAddress ?? "")}</span>
                            {/* <span onClick={() => { handleCopy(collection.contractAddress ?? "")}} className='cursor-pointer'><HugeiconsIcon icon={Copy01Icon} size={16} /></span> */}
                        </div>
                    </div>
                    <div className='flex justify-between my-2 text-[#B392F0] text-xs md:text-sm'>
                        <span>Creator:</span>
                        <span>{formatAddress(collection.creator)}</span>
                    </div>
                    <div className='flex justify-between my-2 text-[#B392F0] text-xs md:text-sm'>
                        <span>Created:</span>
                        <span>{formatCreatedDate(collection.createdAt)}</span>
                    </div>
                    <div className='flex justify-between my-2 text-[#B392F0] text-xs md:text-sm'>
                        <span>Chain:</span>
                        <span><a href="https://www.megaeth.com" target="_blank">{collection.chain}</a></span>
                    </div>
                    <div className='flex justify-between my-2 text-[#B392F0] text-xs md:text-sm'>
                        <span>Royalties:</span>
                        <span>{collection.royalties}%</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
