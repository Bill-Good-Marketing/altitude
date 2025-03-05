'use client';
import {Button} from "~/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "~/components/ui/card"
import {Input} from "~/components/ui/input"
import {Label} from "~/components/ui/label"
import React from "react";
import {EyeIcon, EyeOffIcon, Loader2, LucideProps} from "lucide-react";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {signIn} from "next-auth/react";
import {Checkbox} from "~/components/ui/checkbox";

export default function LoginForm() {
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [rememberMe, setRememberMe] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [passwordVisible, setPasswordVisible] = React.useState(false)

    const router = useRouter();

    return (
        <div className={'flex justify-center mt-[18%]'}>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="me@example.com" required
                               onChange={(e) => setEmail(e.target.value)} value={email}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type={passwordVisible ? 'text' : 'password'} required onChange={(e) => setPassword(e.target.value)}
                               value={password}
                               endIcon={passwordVisible
                                   ? (props: LucideProps) => <EyeOffIcon {...props} onClick={() => setPasswordVisible(false)}/>
                                   : (props: LucideProps) => <EyeIcon {...props} onClick={() => setPasswordVisible(true)}/>}/>
                    </div>
                    <div className="grid gap-2">
                        <div className={'flex items-center gap-2'}>
                            <Checkbox id="rememberMe" checked={rememberMe}
                                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}>
                                Remember me
                            </Checkbox>
                            <Label htmlFor="rememberMe">Remember me</Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        disabled={loading}
                        onClick={async () => {
                            // Validate the form
                            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
                            if (!emailRegex.test(email)) {
                                toast.error('Invalid email');
                                return;
                            }

                            if (password == null || password === '') {
                                toast.error('Password is required');
                                return;
                            }

                            setLoading(true)

                            // Submit sign in request
                            const response = await signIn('standard', {
                                redirect: false, email,
                                password,
                                rememberMe: rememberMe ? 'true' : 'false'
                            });

                            if (response) {
                                if (response.error) {
                                    if (response.error === 'CredentialsSignin')
                                        toast.error('Your email or password is incorrect. Please check them then try again.');
                                    else
                                        toast.error('An error occurred.', {
                                            description: response.error
                                        })
                                    setLoading(false);
                                } else if (!response.ok) {
                                    toast.error('Your email or password is incorrect. Please check them then try again.');
                                    setLoading(false);
                                } else {
                                    router.push('/');
                                }
                            }

                            setLoading(false)
                        }}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Sign in
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
