'use client';

import React, { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "~/components/ui/drawer";
import { useChat } from "ai/react";
import { PlaceholdersAndVanishInput } from "~/components/ui/placeholder-and-vanish-input";
import {
  Calendar,
  ChartBar,
  ChevronDown,
  Edit,
  FileText,
  FolderPlus,
  Lightbulb,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  RotateCw,
  Save,
  Settings2,
  Smile,
  Trash,
  Trash2,
  TrendingUp,
  Upload,
  UserCircle,
  UserCircle2,
  Users,
  X
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tool } from "~/app/(authenticated)/pathfinder/Tool";
import classNames from "classnames";
import { Message } from "ai";
import Markdown from "react-markdown";
import { useAIContext } from "~/app/(authenticated)/pathfinder/AIContext";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useStateRef } from "~/hooks/use-state-ref";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";

// Declare global types for speech recognition to prevent TS errors.
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface CommonRequest {
  id: number;
  text: string;
  icon: string | null;
}

interface CommonRequestGroup {
  id: number;
  name: string;
  requests: CommonRequest[];
}

export function Pathfinder() {
  const { contactId, contactName } = useAIContext();
  const path = usePathname();

  const [visible, setVisible] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  // For common request groups
  const [commonRequestGroups, setCommonRequestGroups] = useState<CommonRequestGroup[]>([
    {
      id: 1,
      name: "General",
      requests: [
        { id: 1, text: "What do I need to do today?", icon: "Calendar" },
        { id: 5, text: "What do I need to do for this client today?", icon: "Calendar" },
        { id: 2, text: "Generate a report", icon: "FileText" }
      ]
    },
    {
      id: 2,
      name: "Analytics",
      requests: [{ id: 3, text: "Analyze market trends", icon: "TrendingUp" }]
    },
    {
      id: 3,
      name: "Clients",
      requests: [{ id: 4, text: "Update client information", icon: "Users" }]
    }
  ]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Speech recognition state is maintained but not used (disabled)
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechToTextPreValue, setSpeechToTextPreValue] = useState("");
  const speechToTextPreValueRef = useStateRef(speechToTextPreValue);

  // Fullscreen state for Drawer
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drawer states for configuration and personality selector.
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPersonalitySelectorOpen, setIsPersonalitySelectorOpen] = useState(false);

  // Define file upload handler.
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Implement your file upload logic here.
      console.log("File uploaded:", file.name);
    }
  };

  // Rename chat hook variables to avoid conflict with block-scoped "input".
  const {
    messages,
    input: chatInput,
    append,
    setInput: setChatInput,
    setMessages,
    stop
  } = useChat({
    body: {
      tzOffset: new Date().getTimezoneOffset(),
      contact: /^\/contacts\/([0-9a-f]{26})\/?$/.test(path)
        ? { id: contactId, fullName: contactName }
        : null
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message);
    }
  });

  // Scroll the message box to the bottom whenever messages update.
  const messageBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messageBoxRef.current?.scrollTo({
      top: messageBoxRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  // Merge successive tool calls into one message.
  const _messages: Message[] = [];
  for (const message of messages) {
    if (_messages.length === 0 || message.toolInvocations == null) {
      _messages.push(message);
    } else {
      const lastMessage = _messages[_messages.length - 1];
      if (lastMessage.toolInvocations != null) {
        lastMessage.toolInvocations.push(...message.toolInvocations);
      } else {
        _messages.push({
          ...message,
          toolInvocations: [...message.toolInvocations]
        });
      }
    }
  }

  // Toggle Drawer visibility using backtick or tilde keys.
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.key === "`" || event.key === "~") && document.activeElement?.id !== "pathfinder-input") {
        event.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener("keypress", listener);
    return () => {
      window.removeEventListener("keypress", listener);
    };
  }, []);

  // Disable speech recognition by not running the recognition start/stop logic.
  // (Alternatively, if you wish to later enable it, you can re-add the effect.)
  useEffect(() => {
    setSpeechRecognitionEnabled(false);
  }, []);

  const handleGroupChange = (index: number) => {
    setCurrentGroupIndex(index);
  };

  const getIcon = (iconName: string | null) => {
    switch (iconName) {
      case "Calendar":
        return <Calendar className="h-4 w-4 mr-2 text-blue-400" />;
      case "FileText":
        return <FileText className="h-4 w-4 mr-2 text-green-400" />;
      case "TrendingUp":
        return <TrendingUp className="h-4 w-4 mr-2 text-yellow-400" />;
      case "Users":
        return <Users className="h-4 w-4 mr-2 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Drawer open={visible} onOpenChange={setVisible}>
        <DrawerContent
          className={classNames(
            "fixed bottom-0 inset-x-0 z-50",
            "bg-gradient-to-br dark:from-zinc-950 dark:to-zinc-900 from-gray-50 to-gray-100",
            "transition-all duration-300 ease-in-out rounded-t-xl shadow-lg border-t border-gray-200 dark:border-zinc-700",
            {
              "h-[70vh]": isFullscreen,
              "h-[40vh]": !isFullscreen
            }
          )}
        >
          <DrawerHeader className="px-4 pt-2 flex items-center justify-between">
            <DrawerTitle>Pathfinder AI</DrawerTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={() => setIsPersonalitySelectorOpen(true)}>
                <UserCircle2 className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(true)}>
                <Settings2 className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setVisible(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
          </DrawerHeader>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-4 mb-2"
          >
            <div className="flex items-center justify-start mb-2">
              <h2 className="text-md font-semibold mr-2">
                {commonRequestGroups[currentGroupIndex].name}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {commonRequestGroups.map((group, index) => (
                    <DropdownMenuItem key={group.id} onSelect={() => handleGroupChange(index)}>
                      {group.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonRequestGroups[currentGroupIndex].requests.map((request) => (
                <Button
                  key={request.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!canSubmit) return;
                    setCanSubmit(false);
                    append({
                      role: "user",
                      content: request.text
                    }).then(() => {
                      setCanSubmit(true);
                    });
                  }}
                  className="flex items-center bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 transition-colors"
                >
                  {getIcon(request.icon)}
                  <span className="truncate">{request.text}</span>
                </Button>
              ))}
            </div>
          </motion.div>

          <div className="flex flex-col h-full">
            <div className="overflow-y-auto low-profile-scrollbar px-4 space-y-4 flex-grow" ref={messageBoxRef}>
              {_messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={classNames("flex", {
                    "w-fit": message.toolInvocations != null,
                    "justify-end": message.role === "user",
                    "justify-start": message.role !== "user"
                  })}
                >
                  {message.toolInvocations != null ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {message.toolInvocations.map((toolInvocation) => (
                          <Tool
                            key={toolInvocation.toolCallId}
                            name={toolInvocation.toolName}
                            args={toolInvocation.args}
                            result={
                              toolInvocation.state === "result"
                                ? toolInvocation.result
                                : undefined
                            }
                            state={toolInvocation.state}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <div
                      className={classNames("p-3 rounded-lg", {
                        "bg-blue-600 text-white": message.role === "user",
                        "dark:bg-zinc-700 bg-zinc-300": message.role !== "user",
                        "max-w-[70%]": !isFullscreen,
                        "max-w-[50%]": isFullscreen
                      })}
                    >
                      <b>{message.role === "user" ? "User: " : "AI: "}</b>
                      {message.role !== "user" ? (
                        <div className="space-y-2 ai-markdown">
                          <Markdown>{message.content}</Markdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-2 px-4 pb-4">
              <hr className="mb-4" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-center space-x-2"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setMessages([])}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <PlaceholdersAndVanishInput
                  id="pathfinder-input"
                  placeholders={["Something or other...", "Another thing...", "Something else..."]}
                  onChange={setChatInput}
                  value={chatInput}
                  onSubmit={() => {
                    if (!canSubmit) return;
                    setCanSubmit(false);
                    append({
                      role: "user",
                      content: chatInput
                    }).then(() => {
                      setCanSubmit(true);
                    });
                  }}
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          stop();
                          setCanSubmit(false);
                          const msgs = [..._messages];
                          while (msgs.length > 0 && msgs[msgs.length - 1].role !== "user") {
                            msgs.pop();
                          }
                          const lastMessage = msgs.pop();
                          if (lastMessage) {
                            setMessages(msgs);
                            append({
                              role: "user",
                              content: lastMessage.content
                            }).then(() => {
                              setCanSubmit(true);
                            });
                            toast.info("Resending last message");
                          } else {
                            setCanSubmit(true);
                            toast.warning("No messages to resend");
                          }
                        }}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resend last message</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Button variant="ghost" size="icon">
                          <Upload className="h-4 w-4" />
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>Upload a file</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ConfigDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isFullScreen={isFullscreen}
        commonRequestGroups={commonRequestGroups}
        onUpdateCommonRequestGroups={setCommonRequestGroups}
      />
      <PersonalitySelector
        isOpen={isPersonalitySelectorOpen}
        onClose={() => setIsPersonalitySelectorOpen(false)}
        isFullScreen={isFullscreen}
      />
    </>
  );
}

/**
 * PersonalitySelector Component
 */
type PersonalitySelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  isFullScreen: boolean;
};

const personalities = [
  { id: "professional", name: "Professional", icon: <UserCircle className="h-5 w-5 mr-2" /> },
  { id: "friendly", name: "Friendly", icon: <Smile className="h-5 w-5 mr-2" /> },
  { id: "creative", name: "Creative", icon: <Lightbulb className="h-5 w-5 mr-2" /> },
  { id: "analytical", name: "Analytical", icon: <ChartBar className="h-5 w-5 mr-2" /> }
];

function PersonalitySelector({ isOpen, onClose, isFullScreen }: PersonalitySelectorProps) {
  const [selectedPersonality, setSelectedPersonality] = useState("professional");

  const handleSave = () => {
    console.log("Selected personality:", selectedPersonality);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className={classNames("mx-auto", { "w-[98%]": isFullScreen, "w-[40vw]": !isFullScreen })}>
        <DrawerHeader>
          <DrawerTitle>Select AI Personality</DrawerTitle>
        </DrawerHeader>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 h-full flex flex-col"
        >
          <RadioGroup value={selectedPersonality} onValueChange={setSelectedPersonality} className="space-y-2">
            {personalities.map((personality) => (
              <div key={personality.id} className="flex items-center space-x-2">
                <RadioGroupItem value={personality.id} id={personality.id} />
                <Label htmlFor={personality.id} className="flex items-center">
                  {personality.icon}
                  {personality.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * ConfigDrawer Component
 */
type ConfigDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  commonRequestGroups: CommonRequestGroup[];
  onUpdateCommonRequestGroups: (groups: CommonRequestGroup[]) => void;
  isFullScreen: boolean;
};

export function ConfigDrawer({
  isOpen,
  onClose,
  commonRequestGroups,
  onUpdateCommonRequestGroups,
  isFullScreen
}: ConfigDrawerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [localGroups, setLocalGroups] = useState(commonRequestGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(commonRequestGroups[0]?.id || 0);
  const [newGroupName, setNewGroupName] = useState("");

  const getIcon = (iconName: string | null) => {
    switch (iconName) {
      case "Calendar":
        return <Calendar className="h-4 w-4 mr-2 text-blue-400" />;
      case "FileText":
        return <FileText className="h-4 w-4 mr-2 text-green-400" />;
      case "TrendingUp":
        return <TrendingUp className="h-4 w-4 mr-2 text-yellow-400" />;
      case "Users":
        return <Users className="h-4 w-4 mr-2 text-purple-400" />;
      default:
        return null;
    }
  };

  const handleEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSave = (groupId: number, id: number) => {
    setLocalGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              requests: group.requests.map((req) =>
                req.id === id ? { ...req, text: editText } : req
              )
            }
          : group
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (groupId: number, id: number) => {
    setLocalGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? { ...group, requests: group.requests.filter((req) => req.id !== id) }
          : group
      )
    );
  };

  const handleAdd = (groupId: number) => {
    const group = localGroups.find((g) => g.id === groupId);
    if (group) {
      const newId = Math.max(...group.requests.map((r) => r.id), 0) + 1;
      setLocalGroups((prevGroups) =>
        prevGroups.map((g) =>
          g.id === groupId
            ? { ...g, requests: [...g.requests, { id: newId, text: "New Request", icon: null }] }
            : g
        )
      );
      handleEdit(newId, "New Request");
    }
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const newId = Math.max(...localGroups.map((g) => g.id), 0) + 1;
      setLocalGroups((prevGroups) => [
        ...prevGroups,
        { id: newId, name: newGroupName.trim(), requests: [] }
      ]);
      setNewGroupName("");
      setSelectedGroupId(newId);
    }
  };

  const handleSaveConfig = () => {
    onUpdateCommonRequestGroups(localGroups);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className={classNames("mx-auto", { "w-[98%]": isFullScreen, "w-[40vw]": !isFullScreen })}>
        <DrawerHeader>
          <DrawerTitle>Configure Common Requests</DrawerTitle>
        </DrawerHeader>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 h-full flex flex-col"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Select
              value={selectedGroupId.toString()}
              onValueChange={(value) => setSelectedGroupId(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {localGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleAddGroup}>
              <FolderPlus className="h-4 w-4 mr-2" /> Add Group
            </Button>
          </div>
          <div className="space-y-2 flex-grow overflow-y-auto">
            {localGroups
              .find((g) => g.id === selectedGroupId)
              ?.requests.map((request) => (
                <div key={request.id} className="flex items-center space-x-2">
                  {editingId === request.id ? (
                    <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-grow" />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 transition-colors"
                    >
                      {getIcon(request.icon)}
                      <span className="truncate">{request.text}</span>
                    </Button>
                  )}
                  {editingId === request.id ? (
                    <Button variant="ghost" size="icon" onClick={() => handleSave(selectedGroupId, request.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(request.id, request.text)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedGroupId, request.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
          <Button onClick={() => handleAdd(selectedGroupId)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" /> Add Request
          </Button>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSaveConfig}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </motion.div>
      </DrawerContent>
    </Drawer>
  );
}
