import { getCourseTeachers, glossaryTeachers, teacherPath } from "../lib/teachers";

type Props = { subject?: string; course?: string; glossary?: boolean };

export default function TeacherCredit({ subject = "", course = "", glossary = false }: Props) {
  const teachers = glossary ? glossaryTeachers : getCourseTeachers(subject, course);
  if (!teachers.length) return null;

  return (
    <p className="teacher-credit mb-4 text-sm leading-relaxed text-muted-foreground">
      {teachers.length > 1 ? "Преподаватели: " : "Преподаватель: "}
      {teachers.map((teacher, index) => (
        <span key={teacher.slug}>
          {index > 0 && ", "}
          <a
            href={teacherPath(teacher)}
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {teacher.name}
          </a>
        </span>
      ))}
    </p>
  );
}
