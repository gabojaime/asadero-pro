import { CreateStaffUserForm } from "@/domains/auth/presentation/components/create-staff-user-form";

export default function StaffPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[28px] font-semibold leading-8 tracking-tight">
          Personal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Administra los usuarios de tu equipo.
        </p>
      </div>

      <CreateStaffUserForm />
    </div>
  );
}
