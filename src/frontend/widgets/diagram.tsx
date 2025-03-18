import { useEffect, useRef } from "react";

type Node = {
  id: string;
  label: string;
  fillStyle: string;
  x: number;
  y: number;
  radius: number;
};

type Edge = {
  label: string;
  source: string;
  target: string;
};

export default function Diagram(props: {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
}) {
  const canvas_ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // const edges: Edge[] = [
    //   {
    //     label: "This is an edge",
    //     source: "Alice",
    //     target: "Bob",
    //   },
    // ];

    // Draw edges
    props.edges.forEach((edge) => {
      const node1 = props.nodes.find((n) => n.id === edge.source)!;
      const node2 = props.nodes.find((n) => n.id === edge.target)!;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(node1.x, node1.y);
      ctx.lineTo(node2.x, node2.y);
      ctx.strokeStyle = "black";
      ctx.stroke();

      // Calculate direction and adjust endpoint to touch node edge
      const angle = Math.atan2(node2.y - node1.y, node2.x - node1.x);
      const adjustedEndX = node2.x - Math.cos(angle) * node2.radius;
      const adjustedEndY = node2.y - Math.sin(angle) * node2.radius;

      // Draw arrowhead
      const arrowSize = 10;
      ctx.beginPath();
      ctx.moveTo(adjustedEndX, adjustedEndY);
      ctx.lineTo(
        adjustedEndX - arrowSize * Math.cos(angle - Math.PI / 6),
        adjustedEndY - arrowSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(adjustedEndX, adjustedEndY);
      ctx.lineTo(
        adjustedEndX - arrowSize * Math.cos(angle + Math.PI / 6),
        adjustedEndY - arrowSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();

      // Draw label
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = edge.label.split("\n");
      const lineHeight = 12; // Adjust as needed
      const totalHeight = lines.length * lineHeight;
      const startY = (node1.y + node2.y) / 2 - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          (node1.x + node2.x) / 2,
          startY + index * lineHeight,
        );
      });
    });

    // Draw nodes
    props.nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.fillStyle;
      ctx.fill();
      ctx.stroke();

      // Draw label
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = node.label.split("\n");
      const lineHeight = 12; // Adjust as needed
      const totalHeight = lines.length * lineHeight;
      const startY = node.y - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, node.x, startY + index * lineHeight);
      });
    });
  }, [props]);

  return <canvas ref={canvas_ref} width={props.width} height={props.height} />;
}
