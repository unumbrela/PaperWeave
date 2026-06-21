/**
 * drawio 模式的内置完整示例：参考 framework3.jpg(FWMamba-UNet 架构)还原。
 * 链路：还原的表单输入 → 喂给 AI 的描述(提示词) → 对应的 draw.io 成图(xml)。
 *
 * 这里的 xml 为手绘的参考产物(忠实于原图主结构、做了适度简化)，供示例区直接渲染，
 * 同时点「载入此示例」会把输入字段填进 drawio 表单，便于用户改改再让 AI 生成。
 */

export const DRAWIO_EXAMPLE = {
  diagramType: "architecture" as const,
  direction: "TB" as const,
  lang: "en" as const,
  subject: "FWMamba-UNet：频率-空间双分支 Mamba 医学图像分割网络的整体架构",
  description: `画 FWMamba-UNet 的整体架构(U 形编码器-解码器)。顶部 Input Image → Patch Embedding。左侧编码器自上而下 3 个 Stage，每个 Stage = FW-Mamba Block ×2，后接 Patch Merging 下采样；底部 Bottleneck = FW-Mamba Block ×2。右侧解码器自下而上 3 个 Stage，每个 = Patch Expanding 上采样 + FW-Mamba Block ×2；顶部 Segmentation Head → Output Mask。编码器与同级解码器之间用 EAFF-Skip 跳跃连接(横向虚线箭头)。右侧另放两个说明块：FW-Mamba Block(含 SSM 分支与频率分支 DWT)、EAFF-Skip(DWT + 边缘注意力融合)。FW-Mamba 块用橙色强调，上/下采样与嵌入用蓝色，瓶颈与分割头用绿色，跳连与说明块用浅紫。`,
  palette: "蓝色=采样/嵌入，橙色=FW-Mamba 块，绿色=瓶颈与分割头，浅紫=跳连与说明",
  xml: `<mxfile host="app.diagrams.net">
  <diagram name="FWMamba-UNet">
    <mxGraphModel dx="900" dy="640" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="900" pageHeight="700" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="e_in" value="Input Image" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="60" y="40" width="160" height="40" as="geometry"/></mxCell>
        <mxCell id="e_pe" value="Patch Embedding" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="60" y="110" width="160" height="40" as="geometry"/></mxCell>
        <mxCell id="e_s1" value="Enc Stage 1&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="60" y="180" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="e_m1" value="Patch Merging ↓" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="60" y="252" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="e_s2" value="Enc Stage 2&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="60" y="312" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="e_m2" value="Patch Merging ↓" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="60" y="384" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="e_s3" value="Enc Stage 3&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="60" y="444" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="e_m3" value="Patch Merging ↓" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="60" y="516" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="bn" value="Bottleneck&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="210" y="588" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="d_out" value="Output Mask" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="420" y="40" width="160" height="40" as="geometry"/></mxCell>
        <mxCell id="d_sh" value="Segmentation Head" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="420" y="110" width="160" height="40" as="geometry"/></mxCell>
        <mxCell id="d_s1" value="Dec Stage 1&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="420" y="180" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="d_x1" value="Patch Expanding ↑" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="420" y="252" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="d_s2" value="Dec Stage 2&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="420" y="312" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="d_x2" value="Patch Expanding ↑" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="420" y="384" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="d_s3" value="Dec Stage 3&#10;FW-Mamba Block ×2" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="420" y="444" width="160" height="48" as="geometry"/></mxCell>
        <mxCell id="d_x3" value="Patch Expanding ↑" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="420" y="516" width="160" height="30" as="geometry"/></mxCell>
        <mxCell id="nb1" value="FW-Mamba Block&#10;= SSM Branch + Frequency Branch (DWT)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;" vertex="1" parent="1"><mxGeometry x="650" y="178" width="190" height="60" as="geometry"/></mxCell>
        <mxCell id="nb2" value="EAFF-Skip&#10;= DWT + Edge Attention Fusion" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;dashed=1;" vertex="1" parent="1"><mxGeometry x="650" y="310" width="190" height="60" as="geometry"/></mxCell>
        <mxCell id="x1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_in" target="e_pe"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x2" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_pe" target="e_s1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x3" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_s1" target="e_m1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x4" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_m1" target="e_s2"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x5" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_s2" target="e_m2"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x6" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_m2" target="e_s3"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x7" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_s3" target="e_m3"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x8" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="e_m3" target="bn"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x9" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="bn" target="d_x3"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x10" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_x3" target="d_s3"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x11" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_s3" target="d_x2"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_x2" target="d_s2"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x13" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_s2" target="d_x1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x14" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_x1" target="d_s1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x15" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_s1" target="d_sh"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="x16" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="d_sh" target="d_out"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="sk1" value="EAFF-Skip" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;strokeColor=#9673a6;endArrow=block;fontColor=#9673a6;" edge="1" parent="1" source="e_s1" target="d_s1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="sk2" value="EAFF-Skip" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;strokeColor=#9673a6;endArrow=block;fontColor=#9673a6;" edge="1" parent="1" source="e_s2" target="d_s2"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="sk3" value="EAFF-Skip" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;dashed=1;strokeColor=#9673a6;endArrow=block;fontColor=#9673a6;" edge="1" parent="1" source="e_s3" target="d_s3"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="nl1" style="html=1;dashed=1;strokeColor=#9673a6;endArrow=none;" edge="1" parent="1" source="nb1" target="d_s1"><mxGeometry relative="1" as="geometry"/></mxCell>
        <mxCell id="nl2" style="html=1;dashed=1;strokeColor=#9673a6;endArrow=none;" edge="1" parent="1" source="nb2" target="d_s2"><mxGeometry relative="1" as="geometry"/></mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`,
};
