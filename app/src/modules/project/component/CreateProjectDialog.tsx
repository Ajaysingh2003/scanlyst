"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTRPCClient } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import { getProjectTitleFromUrl, normalizeWebsiteUrl } from "@/lib/url-utils";
import type { Project } from "@/modules/project/types";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: Project) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { setActiveProject } = useActiveProject();

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isNameCustomized, setIsNameCustomized] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { name: string; website_url: string }) =>
      trpcClient.project.create.mutate(input),
    onSuccess: (newProject) => {
      toast.success("Project created");
      onOpenChange(false);
      setName("");
      setWebsiteUrl("");
      setIsNameCustomized(false);
      if (newProject.id) {
        setActiveProject(newProject.id);
      }
      queryClient.invalidateQueries();
      onSuccess?.(newProject as Project);
    },
    onError: (error) => {
      toast.error(error.message || "Could not create project");
    },
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWebsiteUrl(val);
    if (!isNameCustomized && val.trim()) {
      const derived = getProjectTitleFromUrl(val);
      if (derived && derived !== "New Project") {
        setName(derived);
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsNameCustomized(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedUrl = normalizeWebsiteUrl(websiteUrl);
    let trimmedName = name.trim();
    if (!trimmedName) {
      trimmedName = getProjectTitleFromUrl(trimmedUrl);
    }
    if (!trimmedUrl) {
      toast.error("Please enter a website URL");
      return;
    }
    createMutation.mutate({
      name: trimmedName,
      website_url: trimmedUrl,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName("");
          setWebsiteUrl("");
          setIsNameCustomized(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold text-slate-900">
            Create project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Website URL
              </label>
              <Input
                placeholder="e.g. scanlyst.dev or https://example.com"
                type="text"
                value={websiteUrl}
                onChange={handleUrlChange}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Project name
              </label>
              <Input
                placeholder="e.g. Scanlyst"
                value={name}
                onChange={handleNameChange}
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex space-x-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-background-btn hover:opacity-95 text-white"
              disabled={
                createMutation.isPending ||
                !websiteUrl.trim() ||
                (!name.trim() && !websiteUrl.trim())
              }
            >
              {createMutation.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
