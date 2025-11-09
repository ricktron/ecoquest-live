/**
 * Student viewer controls: segmented + combobox
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentViewerProps {
  viewMode: "me" | "student";
  onViewModeChange: (mode: "me" | "student") => void;
  selectedStudent: string | null;
  onStudentChange: (login: string) => void;
  students: string[];
}

export function StudentViewer({
  viewMode,
  onViewModeChange,
  selectedStudent,
  onStudentChange,
  students,
}: StudentViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-3">
      {/* Segmented control */}
      <div className="inline-flex rounded-lg border border-border bg-muted p-1">
        <Button
          variant={viewMode === "me" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("me")}
          className="rounded-md px-3"
        >
          Me
        </Button>
        <Button
          variant={viewMode === "student" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("student")}
          className="rounded-md px-3"
        >
          Student
        </Button>
      </div>

      {/* Student combobox (only when in student view mode) */}
      {viewMode === "student" && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {selectedStudent || "Select student..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search student..." />
              <CommandList>
                <CommandEmpty>No student found.</CommandEmpty>
                <CommandGroup>
                  {students.map((login) => (
                    <CommandItem
                      key={login}
                      value={login}
                      onSelect={(currentValue) => {
                        onStudentChange(currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedStudent === login ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {login}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
