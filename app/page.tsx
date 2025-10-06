import type { Metadata } from "next";
import Calendar from "@/component/Calendar";
import Context from "@/component/Context";
import { CourseSearch, CoursesAdded } from "@/component/Courses";
import { Terminal, TerminalLayout } from "@/component/Terminal";

export const metadata: Metadata = { title: "yet another course scheduler" };

export default () => {
  return (
    <Context>
      <TerminalLayout grid={{ w: 3, h: 2 }}>
        <Terminal title="calendar" grid={{ w: 2, h: 2 }}>
          <Calendar />
        </Terminal>

        <Terminal title="search courses" grid={{ x: 2 }}>
          <CourseSearch />
        </Terminal>

        <Terminal title="added courses" grid={{ x: 2, y: 1 }}>
          <CoursesAdded />
        </Terminal>
      </TerminalLayout>
    </Context>
  );
};
