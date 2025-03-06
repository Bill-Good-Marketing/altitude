'use client';
import React, {useState} from "react";
import {Button} from "~/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "~/components/ui/dialog";

export function useConfirmation() {
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationTitle, setConfirmationTitle] = useState('Are you sure?');
    const [confirmationButtons, setConfirmationButtons] = useState(['Cancel', 'Confirm']);
    const [confirmationButtonCallback, setConfirmationButtonCallback] = useState<() => Promise<void>>();

    /** Opens the confirmation dialog with the given message, title, and buttons (first button is the cancel button, second button is the confirm button). Also must specify confirmation callback. */
    const confirm = (message: string, callback: () => Promise<void>, title?: string, confirmCaption?: string, cancelCaption?: string) => {
        setConfirmationTitle(title ?? 'Are you sure?');
        setConfirmationButtons([cancelCaption ?? 'Cancel', confirmCaption ?? 'Confirm']);

        const func = async () => {
            await callback();
            setIsConfirming(false);
        }

        setConfirmationButtonCallback(() => func);
        setConfirmationMessage(message);
        setIsConfirming(true);
    }

    return {
        confirm,
        confirmation: <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{confirmationTitle}</DialogTitle>
                    <DialogDescription>{confirmationMessage}</DialogDescription>
                    <div className="space-x-2 space-y-2">
                        <Button variant='destructive' onClick={() => {
                            setIsConfirming(false);
                        }}>{confirmationButtons[0]}</Button>
                        <Button variant='gooeyRight' onClick={() => {
                            setIsConfirming(false);
                            confirmationButtonCallback && confirmationButtonCallback();
                        }}>{confirmationButtons[1]}</Button>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    }
}