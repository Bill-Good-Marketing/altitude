import {withAuthentication} from "~/util/auth/AuthComponentUtils";

function SettingsPage() {
    return <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        something should go here
    </div>
}

export const metadata = {
    title: 'Altitude Settings',
}

export default withAuthentication(SettingsPage);