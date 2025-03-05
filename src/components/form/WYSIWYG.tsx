'use client';

import classNames from "classnames";
import {Editor} from "@tinymce/tinymce-react";
import dynamic from "next/dynamic";
import React from "react";

function WYSIWYG_Internal({content, onChange, setFocused, focused}: {
    content: string;
    onChange: (content: string) => void;
    setFocused?: (focused: boolean) => void;
    focused?: boolean;
}) {
    const [shouldRender, setShouldRender] = React.useState(false);
    const isDark = document.body.classList.contains('dark');

    React.useEffect(() => {
        // There are funky flashing white when the editor first loads, don't want that to happen so we'll wait a bit
        const timeout = setTimeout(() => {
            setShouldRender(true);
        }, 300);

        return () => clearTimeout(timeout);
    }, [])

    return <div className={classNames('editor-container bg-background', {
        'active': focused,
        'hidden': !shouldRender
    })}>
        <Editor
            tinymceScriptSrc={'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.0/tinymce.min.js'}
            onFocus={() => setFocused && setFocused(true)}
            onBlur={() => setFocused && setFocused(false)}
            init={{
                skin: isDark ? 'oxide-dark' : "",
                content_css: isDark ? 'dark' : "",
                branding: false,
                height: 500,
                menubar: true,
                // @ts-expect-error - This is a valid property
                selector: 'textarea',
                promotion: false,
                plugins:
                    "preview searchreplace autolink directionality visualblocks visualchars fullscreen image media link codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount",
                toolbar:
                    "formatselect | bold italic underline strikethrough | forecolor backcolor blockquote | link image media uploadTemplate | alignleft aligncenter alignright alignjustify | numlist bullist outdent indent | removeformat",
                image_advtab: true,
                toolbar_location: "top",
            }}
            value={content}
            onEditorChange={(value) => onChange(value)}/>
    </div>
}

export const WYSIWYG = dynamic(() => {
    'use no memo';
    return Promise.resolve(WYSIWYG_Internal)
}, {
    ssr: false
});