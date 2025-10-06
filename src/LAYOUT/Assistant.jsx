import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hello! 👋 How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");

  // Handle sending a message
  const handleSend = () => {
    if (input.trim() === "") return;

    // Add user message to the chat
    setMessages([...messages, { sender: "user", text: input }]);
    setInput("");

    // (Later) Here you can also trigger an API call to send input to AI
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-4 rounded-full bg-[var(--primary)] text-white shadow-lg hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Drawer Chat */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-w-md ml-auto mr-0 flex flex-col h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>PlaySmart AI Assistant</DrawerTitle>
          </DrawerHeader>

          {/* Chat area */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  msg.sender === "user"
                    ? "ml-auto bg-[var(--primary)] text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
