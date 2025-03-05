'use client';
import React from "react";
import {Textarea} from "~/components/ui/textarea";
import {Button} from "~/components/ui/button";
import {handleServerAction} from "~/util/api/client/APIClient";
import {addNote} from "~/app/(authenticated)/contacts/[guid]/components/Actions";
import {useRouter} from "next/navigation";
import {useQueryClient} from "@tanstack/react-query";

export function NoteInput({contact}: { contact: string }) {
    const [newNote, setNewNote] = React.useState('')
    const router = useRouter();

    const queryClient = useQueryClient()

    const handleCreateNote = async () => {
        const result = handleServerAction(await addNote(contact, newNote));
        if (result.success) {
            setNewNote('');
            router.refresh();
            await queryClient.invalidateQueries({
                queryKey: ['infinite-list', `feed-${contact}`]
            })
        }
    }

    return <div className="flex items-center space-x-4 mb-8">
        <Textarea
            className={'resize-none'}
            placeholder="Add a quick note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={async (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    // Create note
                    await handleCreateNote();
                }
            }}
        />
        <Button variant={'linkHover2'} className={'force-border'} onClick={handleCreateNote}>Add</Button>
    </div>
}