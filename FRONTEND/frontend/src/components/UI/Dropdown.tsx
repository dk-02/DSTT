import {DropdownRoot} from "../base/dropdown/dropdown";
import {DropdownPopover} from "../base/dropdown/dropdown";
import {DropdownMenu} from "../base/dropdown/dropdown";
import {DropdownSection} from "../base/dropdown/dropdown";
import {DropdownItem} from "../base/dropdown/dropdown";
import {DropdownSeparator} from "../base/dropdown/dropdown";
import {DropdownDotsButton} from "../base/dropdown/dropdown";
// import {DropdownSectionHeader} from "../base/dropdown/dropdown";

interface CaseDropdownProps {
    onDelete: () => void;
    onEdit?: () => void;
}

export const Dropdown = ({ onDelete, onEdit }: CaseDropdownProps) => (
    <DropdownRoot>
        <DropdownDotsButton className={"absolute top-2 right-1"} />

        <DropdownPopover className="w-54 bg-gray-800 text-gray-100">
            <DropdownMenu>
                <DropdownSeparator />
                <DropdownSection>
                    <DropdownItem onAction={onEdit}>Edit</DropdownItem>
                    <DropdownItem onAction={onDelete}>Delete</DropdownItem>
                </DropdownSection>
                <DropdownSeparator />
            </DropdownMenu>
        </DropdownPopover>
    </DropdownRoot>
);