import { Flame } from "lucide-react";
import Link from "next/link";

export function AsaderoLogo() {
    return (
        <Link href="/" className="flex items-center gap-3" aria-label="Asadero Pro, inicio">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame aria-hidden="true" data-icon="inline-start" />
            </span>
            <span className="text-base font-semibold tracking-[-0.03em]">Asadero <span className="text-primary">Pro</span></span>
        </Link>
    );
}